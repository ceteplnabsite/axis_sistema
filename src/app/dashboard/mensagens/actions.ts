"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { getPendingUsersCount } from "@/app/dashboard/usuarios/actions"
import { after } from "next/server"
import { destinatariosDoComunicado } from "@/lib/comunicados"
import { atendeCategoria, ehChamado, idsDaFila, podeVerConversa, resumoChamados, type FiltroFila } from "@/lib/chamados"

// Helper de envio de email
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const transporter = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
}) : null;

async function sendNotificationEmail(
  to: string,
  subject: string,
  content: string,
  senderName: string,
  tipo: 'mensagem' | 'comunicado' = 'mensagem'
) {
    const isComunicado = tipo === 'comunicado'
    const emailSubject = isComunicado ? `📢 Comunicado: ${subject}` : `Nova Mensagem: ${subject}`
    const accentColor = isComunicado ? '#ea580c' : '#2563eb'
    const headerBg = isComunicado ? '#fff7ed' : '#eff6ff'
    const badgeLabel = isComunicado ? '📢 COMUNICADO OFICIAL' : '✉️ NOVA MENSAGEM'

    // Limpar HTML do content para exibição no e-mail
    const contentText = content.replace(/<[^>]+>/g, '').substring(0, 300)
    const contentPreview = contentText.length < content.replace(/<[^>]+>/g, '').length
      ? contentText + '…'
      : contentText

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
        <!-- Header -->
        <div style="background: ${headerBg}; padding: 28px 32px; border-bottom: 1px solid #e2e8f0;">
          <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: ${accentColor};">${badgeLabel}</p>
          <h2 style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 700; line-height: 1.3;">${subject}</h2>
          <p style="margin: 8px 0 0 0; color: #64748b; font-size: 13px;">
            ${isComunicado ? 'Comunicado publicado por' : 'Enviado por'}: <strong>${senderName}</strong>
          </p>
        </div>

        <!-- Body -->
        <div style="background: #ffffff; padding: 28px 32px;">
          <p style="margin: 0 0 16px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Conteúdo</p>
          <div style="background: #f8fafc; border-left: 3px solid ${accentColor}; padding: 16px 20px; border-radius: 0 8px 8px 0; color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${contentPreview}</div>
        </div>

        <!-- CTA -->
        <div style="background: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
          <a href="${process.env.NEXTAUTH_URL}/dashboard/mensagens"
             style="display: inline-block; background-color: ${accentColor}; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px; letter-spacing: 0.02em;">
            ${isComunicado ? 'Ver Comunicado na Plataforma →' : 'Ler Mensagem Completa →'}
          </a>
          <p style="margin: 16px 0 0 0; color: #94a3b8; font-size: 11px;">Sistema de Notas CETEP/LNAB — Esta é uma notificação automática.</p>
        </div>
      </div>
    `;

    try {
        if (transporter) {
            await transporter.sendMail({
                from: process.env.SMTP_FROM || '"Sistema de Notas" <no-reply@cetep.edu.br>',
                to,
                subject: emailSubject,
                html,
            });
        } else if (resend) {
            await resend.emails.send({
                from: process.env.RESEND_FROM || 'onboarding@resend.dev',
                to,
                subject: emailSubject,
                html,
            });
        }
    } catch (e) {
        console.error("Erro ao enviar email de notificação", e);
    }
}

export async function sendMessage(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Não autorizado" }
  }

  const subject = formData.get("subject") as string
  const content = formData.get("content") as string
  const category = formData.get("category") as string
  const receiverId = formData.get("receiverId") as string | null
  const parentId = formData.get("parentId") as string | null
  const allowReplies = formData.get("allowReplies") !== "false" 
  const requerCiencia = formData.get("requerCiencia") === "true"
  const fixado = formData.get("fixado") === "true"

  if (!subject || !content || !category) {
    return { error: "Campos obrigatórios faltando" }
  }

  // Validação de Permissão: Professores (Staff sem ser Admin/Direção)
  const user = session.user as any
  const isTeacherOnly = user.isStaff && !user.isSuperuser && !user.isDirecao
  
  if (isTeacherOnly) {
      if (category === "GERAL" && !parentId) {
          return { error: "Você não tem permissão para enviar mensagens diretas." }
      }
      
      if (category === "COMUNICADO") {
          if (!receiverId || !receiverId.startsWith("TURMA_")) {
              return { error: "Você só pode enviar comunicados para suas turmas específicas." }
          }
          
          const targetTurmaId = receiverId.replace("TURMA_", "")
          const hasPermission = await prisma.disciplina.findFirst({
              where: {
                  turmaId: targetTurmaId,
                  usuariosPermitidos: {
                      some: { id: user.id }
                  }
              }
          })
          
          if (!hasPermission) {
              return { error: "Você não tem permissão para enviar comunicados para esta turma." }
          }
      }
  }

  // Resposta: só quem pode ver a conversa; a categoria é sempre a da mensagem raiz
  let raiz: { id: string; senderId: string; category: string; assignedToId: string | null; subject: string } | null = null
  let categoriaEfetiva = category
  if (parentId) {
    raiz = await prisma.message.findUnique({
      where: { id: parentId },
      select: { id: true, senderId: true, category: true, assignedToId: true, subject: true }
    })
    if (!raiz || !(await podeVerConversa(user, raiz.id))) return { error: "Conversa não encontrada" }
    categoriaEfetiva = raiz.category
  }

  try {
    let finalParentId = parentId;
    let targetReceiverId = receiverId;

    if (category === "SUPORTE" || category === "DIRECAO") {
       targetReceiverId = null;
    }
    if (category === "COMUNICADO" && !receiverId) {
        targetReceiverId = null; 
    }

    const newMessage = await prisma.message.create({
      data: {
        subject: finalParentId ? `[Ticket] ${subject}` : subject,
        content,
        category: categoriaEfetiva as any,
        senderId: user.id,
        receiverId: targetReceiverId || undefined,
        isRead: false,
        parentId: finalParentId || undefined,
        allowReplies,
        // só comunicados (raiz) pedem ciência / ficam fixados; fixar é da Direção e administradores
        requerCiencia: category === "COMUNICADO" && !finalParentId && requerCiencia,
        fixado: category === "COMUNICADO" && !finalParentId && fixado && (!!user.isSuperuser || !!user.isDirecao)
      }
    })

    // Auto-marcar como lido para o remetente
    await prisma.messageRead.create({
        data: {
            messageId: newMessage.id,
            userId: user.id
        }
    })

    if (categoriaEfetiva === "GERAL" && targetReceiverId) {
        const receiver = await prisma.user.findUnique({ where: { id: targetReceiverId } });
        if (receiver && receiver.email) {
            sendNotificationEmail(receiver.email, subject, content, user.name || user.username);
        }
    }
    
    // ── Chamados: avisa por e-mail só quem precisa agir ──────────────────────
    // novo chamado → quem atende; resposta da equipe → solicitante;
    // resposta do solicitante → quem assumiu (ou, se ninguém assumiu, quem atende)
    if (ehChamado(categoriaEfetiva)) {
        const quemAtende = () => prisma.user.findMany({
            where: {
                OR: [{ isSuperuser: true }, ...(categoriaEfetiva === "DIRECAO" ? [{ isDirecao: true }] : [])],
                isActive: true
            },
            select: { email: true }
        })
        let destinos: { email: string | null }[] = []
        if (!raiz) destinos = await quemAtende()
        else if (user.id !== raiz.senderId) destinos = await prisma.user.findMany({ where: { id: raiz.senderId, isActive: true }, select: { email: true } })
        else if (raiz.assignedToId) destinos = await prisma.user.findMany({ where: { id: raiz.assignedToId, isActive: true }, select: { email: true } })
        else destinos = await quemAtende()

        const emails = [...new Set(destinos.map(d => d.email).filter((e): e is string => !!e && e !== user.email))]
        const assuntoEmail = raiz ? `Re: ${raiz.subject.replace(/\[Ticket\]\s*/gi, '')}` : subject
        after(async () => {
            for (const e of emails) await sendNotificationEmail(e, assuntoEmail, content, user.name || user.username)
        })
    }

    // ── Comunicados: e-mail para os destinatários ────────────────────────────
    // (só na mensagem raiz; respostas a um comunicado não reenviam para todos)
    if (category === "COMUNICADO" && !finalParentId) {
      const destinatarios = await destinatariosDoComunicado(targetReceiverId, user.id)
      const senderName = user.name || user.username || 'Sistema'
      const assuntoEmail = requerCiencia ? `${subject} — confirme a ciência` : subject
      // after(): roda depois da resposta, mas a função espera terminar (não é cortada no meio)
      after(async () => {
        for (let i = 0; i < destinatarios.length; i += 5) {
          await Promise.all(destinatarios.slice(i, i + 5).map(d => sendNotificationEmail(d.email, assuntoEmail, content, senderName, 'comunicado')))
        }
        console.log(`📧 Comunicado enviado por e-mail para ${destinatarios.length} destinatário(s)`)
      })
    }

    if (finalParentId) {
        // Chamado: a resposta da equipe deixa "aguardando o solicitante"; a resposta do
        // solicitante devolve para a equipe (e reabre se estava resolvido)
        const status = raiz && ehChamado(raiz.category)
            ? (user.id !== raiz.senderId
                ? { status: "AGUARDANDO_RESPOSTA" as const, isResolved: false, fechamento: null, assignedToId: raiz.assignedToId ?? user.id }
                : { status: (raiz.assignedToId ? "EM_ATENDIMENTO" : "ABERTO") as "EM_ATENDIMENTO" | "ABERTO", isResolved: false, fechamento: null })
            : {}
        await prisma.message.update({
            where: { id: finalParentId },
            data: { updatedAt: new Date(), ...status }
        })
    }

    revalidatePath("/dashboard/mensagens")
    return { success: true }
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error)
    return { error: "Erro ao enviar mensagem" }
  }
}

export async function markAsRead(id: string) {
  const session = await auth()
  if (!session?.user?.id) return

  // Pegamos a mensagem para saber se é raiz ou resposta
  const msg = await prisma.message.findUnique({
      where: { id },
      select: { id: true, parentId: true }
  })
  if (!msg) return

  const rootId = msg.parentId || msg.id
  
  // Buscamos todas as mensagens dessa thread que o usuário ainda não leu
  const unreadInThread = await prisma.message.findMany({
      where: {
          AND: [
              { OR: [{ id: rootId }, { parentId: rootId }] },
              { readBy: { none: { userId: session.user.id } } }
          ]
      },
      select: { id: true }
  })

  // Criamos os registros de leitura em lote
  if (unreadInThread.length > 0) {
      await prisma.messageRead.createMany({
          data: unreadInThread.map(m => ({
              messageId: m.id,
              userId: session.user.id
          })),
          skipDuplicates: true
      })
  }
  
  revalidatePath("/dashboard/mensagens")
}

export async function markAllAsRead() {
  const session = await auth()
  if (!session?.user?.id) return { success: false }

  const user = session.user as any

  const allowedReceiverIds: (string | null)[] = [null];
  if (user.isStaff) allowedReceiverIds.push('GROUP_TEACHERS');
  if (user.isStaff || user.isSuperuser) allowedReceiverIds.push('GROUP_STAFF');
  if (user.isDirecao || user.isSuperuser) allowedReceiverIds.push('GROUP_DIRECAO');
  if (user.estudanteId) allowedReceiverIds.push('GROUP_STUDENTS');

  if (user.isStaff) {
      const teacher = await prisma.user.findUnique({
          where: { id: user.id },
          include: { disciplinasPermitidas: { select: { turmaId: true } } }
      });
      const teacherTurmas = teacher?.disciplinasPermitidas.map((d: any) => `TURMA_${d.turmaId}`) || [];
      allowedReceiverIds.push(...teacherTurmas);
  }

  if (user.estudanteId) {
      const student = await prisma.user.findUnique({
         where: { id: user.id },
         include: { estudante: { select: { turmaId: true } } }
      });
      if (student?.estudante?.turmaId) {
          allowedReceiverIds.push(`TURMA_${student.estudante.turmaId}`);
      }
  }

  const allowedReceiverStrings = allowedReceiverIds.filter((id): id is string => id !== null);
  
  const whereConditions: any[] = [
    { receiverId: user.id }
  ]

  if (!user.isSuperuser) {
      whereConditions.push({ 
        AND: [
          { category: "COMUNICADO" },
          { senderId: { not: user.id } },
          {
             OR: [
               { receiverId: null },
               { receiverId: { in: allowedReceiverStrings } }
             ]
          }
        ]
      })
      if (user.isDirecao) {
          whereConditions.push({ category: "DIRECAO" as any, senderId: { not: user.id } })
      }
  } else {
      whereConditions.push({ category: "SUPORTE" as any, senderId: { not: user.id } })
  }

  const unreadMessages = await prisma.message.findMany({
    where: {
        AND: [
            { OR: whereConditions },
            { readBy: { none: { userId: user.id } } },
            { deletedBy: { none: { userId: user.id } } },
            { NOT: { subject: { startsWith: '[Cadastro Pendente]' } } }
        ]
    },
    select: { id: true }
  })

  if (unreadMessages.length > 0) {
      await prisma.messageRead.createMany({
          data: unreadMessages.map(m => ({
              messageId: m.id,
              userId: user.id
          })),
          skipDuplicates: true
      })
  }
  
  revalidatePath("/dashboard/mensagens")
  return { success: true }
}


export async function deleteMessage(messageId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Não autorizado" }

    try {
        await prisma.messageDelete.create({
            data: {
                messageId,
                userId: session.user.id
            }
        })
        revalidatePath("/dashboard/mensagens")
        return { success: true }
    } catch (e) {
        console.error("Erro ao deletar mensagem:", e)
        return { error: "Erro ao deletar mensagem" }
    }
}

export async function getMessages(options: { page?: number, limit?: number, type?: 'all' | 'received' | 'sent' } = {}) {
  const { page = 1, limit = 20, type = 'all' } = options;
  const skip = (page - 1) * limit;

  const session = await auth()
  if (!session?.user?.id) return { received: [], sent: [] } 

  const user = session.user as any
  let received: any[] = []
  let sent: any[] = []

  if (type === 'all' || type === 'received') {
      const allowedReceiverIds: (string | null)[] = [null];

      if (user.isStaff) allowedReceiverIds.push('GROUP_TEACHERS');
      if (user.isStaff || user.isSuperuser) allowedReceiverIds.push('GROUP_STAFF');
      if (user.isDirecao || user.isSuperuser) allowedReceiverIds.push('GROUP_DIRECAO');
      if (user.estudanteId) allowedReceiverIds.push('GROUP_STUDENTS');

      if (user.isStaff) {
          const teacher = await prisma.user.findUnique({
              where: { id: user.id },
              include: { disciplinasPermitidas: { select: { turmaId: true } } }
          });
          const teacherTurmas = teacher?.disciplinasPermitidas.map((d: any) => `TURMA_${d.turmaId}`) || [];
          allowedReceiverIds.push(...teacherTurmas);
      }

      if (user.estudanteId) {
          const student = await prisma.user.findUnique({
             where: { id: user.id },
             include: { estudante: { select: { turmaId: true } } }
          });
          if (student?.estudante?.turmaId) {
              allowedReceiverIds.push(`TURMA_${student.estudante.turmaId}`);
          }
      }

      const allowedReceiverStrings = allowedReceiverIds.filter((id): id is string => id !== null);

      // Thread-centric logic: 
      // We want root messages (parentId: null) that either:
      // a) Were received by me (and not sent by me)
      // b) Have any reply received by me (and not sent by me)
      
      const receivedRaw = await prisma.message.findMany({
        where: { 
            parentId: null,
            deletedBy: { none: { userId: user.id } },
            NOT: { subject: { startsWith: '[Cadastro Pendente]' } },
            OR: [
                // Directly received
                { receiverId: user.id, senderId: { not: user.id } },
                { replies: { some: { receiverId: user.id, senderId: { not: user.id } } } },
                // Categorized
                ...(user.isSuperuser ? [
                    { category: "SUPORTE" as any, senderId: { not: user.id } },
                    { replies: { some: { category: "SUPORTE" as any, senderId: { not: user.id } } } }
                ] : []),
                ...((user.isDirecao || user.isSuperuser) ? [
                    { category: "DIRECAO" as any, senderId: { not: user.id } },
                    { replies: { some: { category: "DIRECAO" as any, senderId: { not: user.id } } } }
                ] : []),
                // Comunicados direcionados (grupo específico)
                { 
                    AND: [
                        { category: "COMUNICADO" as any },
                        { senderId: { not: user.id } },
                        { receiverId: { in: allowedReceiverStrings } }
                    ]
                },
            ]
        },
        include: {
          sender: { select: { id: true, name: true, email: true, username: true } },
          assignedTo: { select: { id: true, name: true } },
          replies: {
              where: { deletedBy: { none: { userId: user.id } } },
              include: { readBy: { where: { userId: user.id }, select: { id: true } } },
              orderBy: { createdAt: 'desc' },
              take: 1
          },
          readBy: { where: { userId: user.id }, select: { id: true } },
          ciencias: { where: { userId: user.id }, select: { createdAt: true } },
          _count: { select: { ciencias: true } }
        },
        orderBy: { updatedAt: 'desc' } as any,
        take: limit,
        skip: skip
      })

      // ── Comunicados GERAIS (receiverId: null) aparecem SEMPRE para qualquer usuário ──
      // Buscamos separadamente sem paginação para que novos usuários os vejam mesmo
      // que não estivessem cadastrados quando foram enviados.
      const comunicadosGerais = await prisma.message.findMany({
        where: {
            parentId: null,
            category: "COMUNICADO" as any,
            receiverId: null,
            senderId: { not: user.id },
            deletedBy: { none: { userId: user.id } },
            NOT: { subject: { startsWith: '[Cadastro Pendente]' } },
        },
        include: {
          sender: { select: { id: true, name: true, email: true, username: true } },
          assignedTo: { select: { id: true, name: true } },
          replies: {
              where: { deletedBy: { none: { userId: user.id } } },
              include: { readBy: { where: { userId: user.id }, select: { id: true } } },
              orderBy: { createdAt: 'desc' },
              take: 1
          },
          readBy: { where: { userId: user.id }, select: { id: true } },
          ciencias: { where: { userId: user.id }, select: { createdAt: true } },
          _count: { select: { ciencias: true } }
        },
        orderBy: { createdAt: 'desc' } as any,
        take: limit,
        skip: skip
      })

      // Mescla sem duplicatas (comunicado pode ter aparecido nas duas queries)
      const idsJaIncluidos = new Set(receivedRaw.map((m: any) => m.id))
      const comunicadosNovos = comunicadosGerais.filter((m: any) => !idsJaIncluidos.has(m.id))
      const todasRecebidas = [...receivedRaw, ...comunicadosNovos]
        .sort((a: any, b: any) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())

      const respondidosR = await chamadosRespondidos(todasRecebidas.filter((m: { category: string }) => ehChamado(m.category)).map((m: { id: string }) => m.id))
      received = todasRecebidas.map((msg: any) => {
          const isRootUnread = msg.readBy.length === 0 && (msg.receiverId === user.id || msg.category !== 'GERAL');
          const lastReply = msg.replies[0];
          const isLastReplyUnread = lastReply ? lastReply.readBy.length === 0 : false;
          
          return {
              ...msg,
              respondido: respondidosR.has(msg.id),
              isRead: !isRootUnread && !isLastReplyUnread
          }
      })
  }

  if (type === 'all' || type === 'sent') {
      const sentRaw = await prisma.message.findMany({
        where: { 
            parentId: null,
            deletedBy: { none: { userId: user.id } },
            NOT: { subject: { startsWith: '[Cadastro Pendente]' } },
            OR: [
                { senderId: user.id },
                { replies: { some: { senderId: user.id } } }
            ]
        },
        include: {
            sender: { select: { id: true, name: true, email: true, username: true } },
            assignedTo: { select: { id: true, name: true } },
            replies: {
                where: {
                    deletedBy: { none: { userId: user.id } }
                },
                include: {
                    readBy: { where: { userId: user.id }, select: { id: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: 1
            },
            readBy: { where: { userId: user.id }, select: { id: true } },
            _count: { select: { ciencias: true } }
        },
        orderBy: { updatedAt: 'desc' } as any,
        take: limit,
        skip: skip
      })

      // Buscar dados dos destinatários manualmente (já que removemos a FK para permitir grupos)
      const receiverIds = Array.from(new Set(sentRaw.map(m => m.receiverId).filter(id => id && !id.startsWith('TURMA_') && !id.startsWith('GROUP_')))) as string[];
      const receivers = await prisma.user.findMany({
          where: { id: { in: receiverIds } },
          select: { id: true, name: true, email: true }
      });
      const receiverMap = new Map(receivers.map(r => [r.id, r]));

      const respondidosS = await chamadosRespondidos(sentRaw.filter(m => ehChamado(m.category)).map(m => m.id))
      sent = sentRaw.map((msg: any) => {
          const isRootUnread = msg.readBy.length === 0 && (msg.receiverId === user.id || (msg.category !== 'GERAL' && msg.senderId !== user.id));
          const lastReply = msg.replies[0];
          // Uma mensagem no "Enviados" é não lida se a ÚLTIMA resposta não foi lida por mim
          const isLastReplyUnread = lastReply ? (lastReply.readBy.length === 0 && lastReply.senderId !== user.id) : false;
          
          return {
              ...msg,
              receiver: msg.receiverId ? (receiverMap.get(msg.receiverId) || null) : null,
              respondido: respondidosS.has(msg.id),
              isRead: !isRootUnread && !isLastReplyUnread
          }
      })
  }

  return { received, sent }
}

export async function getUsersForSelect() {
    const users = await prisma.user.findMany({
        where: { isActive: true },
        select: {
            id: true,
            name: true,
            username: true,
            isSuperuser: true,
            isDirecao: true,
            isStaff: true,
            estudanteId: true,
            isPortalUser: true
        },
        orderBy: { name: 'asc' }
    })
    return users
}

export async function getTurmasForSelect() {
    const session = await auth()
    if (!session?.user?.id) return []

    const user = session.user as any
    const isTeacherOnly = user.isStaff && !user.isSuperuser && !user.isDirecao
    const where: any = { anoLetivo: 2026, status: 'ATIVA' } // encerradas repetem nomes

    if (isTeacherOnly) {
        where.disciplinas = {
            some: {
                usuariosPermitidos: {
                    some: { id: user.id }
                }
            }
        }
    }

    const turmas = await prisma.turma.findMany({
        where,
        select: {
            id: true,
            nome: true,
            curso: true,
            serie: true
        },
        orderBy: { nome: 'asc' }
    })
    return turmas
}

export async function getUnreadCount() {
    const session = await auth()
    if (!session?.user?.id) return 0
  
    const user = session.user as any
  
    const allowedReceiverIds: (string | null)[] = [null];

    if (user.isStaff) allowedReceiverIds.push('GROUP_TEACHERS');
    if (user.isStaff || user.isSuperuser) allowedReceiverIds.push('GROUP_STAFF');
    if (user.isDirecao || user.isSuperuser) allowedReceiverIds.push('GROUP_DIRECAO');
    if (user.estudanteId) allowedReceiverIds.push('GROUP_STUDENTS');

     if (user.isStaff) {
        const teacher = await prisma.user.findUnique({
            where: { id: user.id },
            include: { disciplinasPermitidas: { select: { turmaId: true } } }
        });
        const teacherTurmas = teacher?.disciplinasPermitidas.map((d: any) => `TURMA_${d.turmaId}`) || [];
        allowedReceiverIds.push(...teacherTurmas);
    }

    if (user.estudanteId) {
        const student = await prisma.user.findUnique({
           where: { id: user.id },
           include: { estudante: { select: { turmaId: true } } }
        });
        if (student?.estudante?.turmaId) {
            allowedReceiverIds.push(`TURMA_${student.estudante.turmaId}`);
        }
    }

    const allowedReceiverStrings = allowedReceiverIds.filter((id): id is string => id !== null);
    
    const whereConditions: any[] = [
      { receiverId: user.id }
    ]
  
    if (!user.isSuperuser) {
        whereConditions.push({ 
          AND: [
            { category: "COMUNICADO" },
            { senderId: { not: user.id } },
            {
               OR: [
                 { receiverId: null },
                 { receiverId: { in: allowedReceiverStrings } }
               ]
            }
          ]
        })
        if (user.isDirecao) {
            whereConditions.push({ category: "DIRECAO" as any, senderId: { not: user.id } })
        }
    } else {
        whereConditions.push({ category: "SUPORTE" as any, senderId: { not: user.id } })
    }
  
    const count = await prisma.message.count({
      where: {
          AND: [
              { OR: whereConditions },
              {
                  readBy: {
                      none: {
                          userId: user.id
                      }
                  }
              },
              {
                  deletedBy: {
                      none: {
                          userId: user.id
                      }
                  }
              },
              { NOT: { subject: { startsWith: '[Cadastro Pendente]' } } }
          ]
      }
    })
  
    return count
}

// Junta as duas contagens do sidebar (mensagens não lidas + cadastros pendentes)
// numa única invocação, em vez de duas chamadas separadas a cada polling.
export async function getSidebarBadges() {
    const [unreadCount, pendingUsersCount] = await Promise.all([
        getUnreadCount(),
        getPendingUsersCount()
    ])
    return { unreadCount, pendingUsersCount }
}

export async function getLatestUnreadMessage() {
    const session = await auth()
    if (!session?.user?.id) return null
  
    const user = session.user as any
    const allowedReceiverIds: (string | null)[] = [null];

    if (user.isStaff) allowedReceiverIds.push('GROUP_TEACHERS');
    if (user.isStaff || user.isSuperuser) allowedReceiverIds.push('GROUP_STAFF');
    if (user.isDirecao || user.isSuperuser) allowedReceiverIds.push('GROUP_DIRECAO');
    if (user.estudanteId) allowedReceiverIds.push('GROUP_STUDENTS');

     if (user.isStaff) {
        const teacher = await prisma.user.findUnique({
            where: { id: user.id },
            include: { disciplinasPermitidas: { select: { turmaId: true } } }
        });
        const teacherTurmas = teacher?.disciplinasPermitidas.map((d: any) => `TURMA_${d.turmaId}`) || [];
        allowedReceiverIds.push(...teacherTurmas);
    }

    if (user.estudanteId) {
        const student = await prisma.user.findUnique({
           where: { id: user.id },
           include: { estudante: { select: { turmaId: true } } }
        });
        if (student?.estudante?.turmaId) {
            allowedReceiverIds.push(`TURMA_${student.estudante.turmaId}`);
        }
    }

    const allowedReceiverStrings = allowedReceiverIds.filter((id): id is string => id !== null);

    const whereConditions: any[] = [
      { receiverId: user.id }
    ]
  
    if (!user.isSuperuser) {
        whereConditions.push({ 
          AND: [
            { category: "COMUNICADO" },
            { senderId: { not: user.id } },
            {
               OR: [
                 { receiverId: null },
                 { receiverId: { in: allowedReceiverStrings } }
               ]
            }
          ]
        })
        if (user.isDirecao) {
            whereConditions.push({ category: "DIRECAO" as any, senderId: { not: user.id } })
        }
    } else {
        whereConditions.push({ category: "SUPORTE" as any, senderId: { not: user.id } })
    }
  
    const latest = await prisma.message.findFirst({
      where: {
          AND: [
              { OR: whereConditions },
              {
                  readBy: {
                      none: {
                          userId: user.id
                      }
                  }
              },
              {
                  deletedBy: {
                      none: {
                          userId: user.id
                      }
                  }
              },
              { NOT: { subject: { startsWith: '[Cadastro Pendente]' } } }
          ]
      },
      include: {
        sender: { select: { name: true, username: true } },
        assignedTo: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
  
    return latest
}

export async function getMessageThread(messageId: string) {
    const session = await auth()
    if (!session?.user?.id) return []
    const userId = session.user.id
    
    const target = await prisma.message.findUnique({ 
        where: { id: messageId },
        select: { id: true, parentId: true }
    })
    
    if (!target) return []

    const rootId = target.parentId || target.id
    if (!(await podeVerConversa(session.user, rootId))) return []

    const thread = await prisma.message.findMany({
        where: {
            AND: [
                {
                    OR: [
                        { id: rootId },
                        { parentId: rootId }
                    ]
                },
                {
                    deletedBy: {
                        none: {
                            userId: userId
                        }
                    }
                }
            ]
        },
        include: {
            sender: { select: { id: true, name: true, email: true, username: true } },
            assignedTo: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'asc' }
    })
    
    return thread
}

/** Carrega a raiz de um chamado e diz se o usuário atende ou abriu esse chamado */
async function chamadoDoUsuario(ticketId: string) {
  const session = await auth()
  if (!session?.user?.id) return null
  const c = await prisma.message.findFirst({
    where: { id: ticketId, parentId: null },
    select: { id: true, senderId: true, category: true, status: true, assignedToId: true }
  })
  if (!c || !ehChamado(c.category)) return null
  const user = session.user
  return { c, user, atende: atendeCategoria(user, c.category), solicitante: c.senderId === user.id }
}

export async function assignTicket(ticketId: string) {
  const r = await chamadoDoUsuario(ticketId)
  if (!r || !r.atende) return { error: "Sem permissão para assumir este chamado" }

  try {
    await prisma.message.update({
      where: { id: ticketId },
      data: {
        assignedToId: r.user.id,
        // assumir não tira de "aguardando o solicitante"
        ...(r.c.status === 'ABERTO' ? { status: "EM_ATENDIMENTO" as const } : {})
      }
    })
    revalidatePath("/dashboard/mensagens")
    return { success: true }
  } catch (e) {
    console.error("Erro ao assumir chamado:", e)
    return { error: "Erro ao assumir chamado" }
  }
}

/** Resolver (equipe ou solicitante) ou reabrir um chamado */
export async function updateTicketStatus(ticketId: string, status: string) {
  const r = await chamadoDoUsuario(ticketId)
  if (!r || !(r.atende || r.solicitante)) return { error: "Sem permissão para alterar este chamado" }
  if (status !== 'RESOLVIDO' && status !== 'ABERTO') return { error: "Status inválido" }

  try {
    const data = status === 'RESOLVIDO'
      ? { status: 'RESOLVIDO' as const, isResolved: true, fechamento: null }
      : { status: (r.c.assignedToId ? 'EM_ATENDIMENTO' : 'ABERTO') as 'EM_ATENDIMENTO' | 'ABERTO', isResolved: false, fechamento: null }
    await prisma.message.update({ where: { id: ticketId }, data })
    revalidatePath("/dashboard/mensagens")
    return { success: true, status: data.status }
  } catch (e) {
    console.error("Erro ao atualizar status:", e)
    return { error: "Erro ao atualizar status" }
  }
}

/** Contagens do painel da fila (só para quem atende chamados) */
export async function getResumoFila() {
  const session = await auth()
  if (!session?.user?.id) return null
  const r = await resumoChamados(session.user)
  return r.categorias.length ? r : null
}

/** Chamados de um filtro da fila, no mesmo formato da lista de recebidas */
export async function getFilaChamados(filtro: FiltroFila) {
  const session = await auth()
  if (!session?.user?.id) return []
  const userId = session.user.id
  const ids = await idsDaFila(session.user, filtro)
  if (!ids.length) return []
  const msgs = await prisma.message.findMany({
    where: { id: { in: ids } },
    include: {
      sender: { select: { id: true, name: true, email: true, username: true } },
      assignedTo: { select: { id: true, name: true } },
      replies: {
        where: { deletedBy: { none: { userId } } },
        include: { readBy: { where: { userId }, select: { id: true } } },
        orderBy: { createdAt: 'desc' },
        take: 1
      },
      readBy: { where: { userId }, select: { id: true } },
    }
  })
  const respondidos = await chamadosRespondidos(ids)
  const ordem = new Map(ids.map((id, i) => [id, i]))
  return msgs
    .sort((a, b) => (ordem.get(a.id) ?? 0) - (ordem.get(b.id) ?? 0))
    .map(m => ({
      ...m,
      respondido: respondidos.has(m.id),
      isRead: m.readBy.length > 0 && !(m.replies[0] && m.replies[0].readBy.length === 0 && m.replies[0].senderId !== userId)
    }))
}

/** Quais chamados já tiveram resposta de alguém além do solicitante */
async function chamadosRespondidos(ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set()
  const r = await prisma.$queryRaw<{ id: string }[]>`
    select distinct m.id from messages m
      join messages x on x.parent_id = m.id and x.sender_id <> m.sender_id
     where m.id = any(${ids})`
  return new Set(r.map(x => x.id))
}

export async function getTurmaDetails(turmaId: string) {
    const session = await auth()
    if (!session?.user?.id) return { disciplinas: [], estudantes: [] }

    const turma = await prisma.turma.findUnique({
        where: { id: turmaId },
        include: {
            disciplinas: {
                select: { id: true, nome: true },
                orderBy: { nome: 'asc' }
            },
            estudantes: {
                select: { matricula: true, nome: true },
                orderBy: { nome: 'asc' }
            }
        }
    })

    return {
        disciplinas: turma?.disciplinas || [],
        estudantes: turma?.estudantes || []
    }
}
