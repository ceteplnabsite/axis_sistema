
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

// Configuração do Resend
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Configuração do SMTP (Nodemailer)
const transporter = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
}) : null;

export async function enviarSenhaPorEmail(email: string, nome: string, senhaGerada: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://ceteplnab.com.br';
  const subject = 'Seu acesso ao Sistema de Notas CETEP/LNAB';
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h1 style="color: #0f172a;">Olá, ${nome}!</h1>
      <p style="color: #475569;">Seu acesso ao sistema foi criado com sucesso.</p>
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #64748b; font-size: 14px;">Seus dados de acesso:</p>
        <p style="margin: 10px 0 0 0; color: #0f172a;"><strong>Login:</strong> ${email}</p>
        <p style="margin: 5px 0 0 0; color: #0f172a;"><strong>Senha Provisória:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${senhaGerada}</code></p>
      </div>
      <p style="color: #ef4444; font-size: 13px; font-weight: bold;">Recomendamos trocar sua senha após o primeiro acesso.</p>
      <a href="${baseUrl}/login" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">Acessar o Sistema</a>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">
      <p style="color: #94a3b8; font-size: 12px;">Esta é uma mensagem automática, por favor não responda.</p>
    </div>
  `;

  // 1. Tentar via SMTP se configurado
  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Sistema de Notas" <no-reply@cetep.edu.br>',
        to: email,
        subject,
        html,
      });
      console.log('E-mail enviado via SMTP para:', email);
      return true;
    } catch (error) {
      console.error('Erro ao enviar e-mail via SMTP:', error);
    }
  }

  // 2. Tentar via Resend se configurado
  if (resend) {
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM || 'onboarding@resend.dev',
        to: email,
        subject,
        html,
      });
      console.log('E-mail enviado via Resend para:', email);
      return true;
    } catch (error) {
      console.error('Erro ao enviar e-mail via Resend:', error);
    }
  }

  // 3. Fallback: Log em desenvolvimento se nada estiver configurado
  console.warn('⚠️ NENHUM SERVIÇO DE E-MAIL CONFIGURADO (SMTP ou Resend).');
  console.log('-----------------------------------');
  console.log('SIMULAÇÃO DE E-MAIL:');
  console.log('Para:', email);
  console.log('Senha:', senhaGerada);
  console.log('-----------------------------------');
  
  return false;
}

export async function enviarEmailConfirmacaoCadastro(email: string, nome: string) {
  const subject = 'Recebemos sua solicitação de cadastro - CETEP/LNAB';
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h1 style="color: #0f172a;">Olá, ${nome}!</h1>
      <p style="color: #475569;">Sua solicitação de cadastro no Sistema de Notas CETEP/LNAB foi recebida com sucesso.</p>
      <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bae6fd;">
        <p style="margin: 0; color: #0369a1; font-weight: bold;">Status: Aguardando Aprovação</p>
        <p style="margin: 10px 0 0 0; color: #0c4a6e; font-size: 14px;">Um administrador revisará seus dados em breve. Assim que seu acesso for liberados, você receberá um novo e-mail com sua senha temporária.</p>
      </div>
      <p style="color: #64748b; font-size: 12px;">Se você não solicitou este cadastro, por favor ignore este e-mail.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">
      <p style="color: #94a3b8; font-size: 12px;">Esta é uma mensagem automática, por favor não responda.</p>
    </div>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Sistema de Notas" <no-reply@cetep.edu.br>',
        to: email,
        subject,
        html,
      });
      return true;
    } catch (error) {
      console.error('Erro ao enviar e-mail de confirmação:', error);
    }
  }

  if (resend) {
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM || 'onboarding@resend.dev',
        to: email,
        subject,
        html,
      });
      return true;
    } catch (error) {
      console.error('Erro ao enviar e-mail de confirmação via Resend:', error);
    }
  }

  return false;
}
export async function enviarEmailConfirmacaoJogos(email: string, teamName: string, modalityName: string, leaderName: string, members: string[]) {
  const subject = `Confirmação de Inscrição: ${teamName} - Jogos Escolares`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h1 style="color: #0f172a; text-align: center;">Inscrição Confirmada! 🏆</h1>
      <p style="color: #475569; font-size: 16px;">Olá, <strong>${leaderName}</strong>! Recebemos com sucesso a inscrição da sua equipe para os Jogos Escolares.</p>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
        <h2 style="margin-top: 0; color: #0f172a; font-size: 18px;">Detalhes da Equipe</h2>
        <p style="margin: 5px 0; color: #475569;"><strong>Time:</strong> ${teamName}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Modalidade:</strong> ${modalityName}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Líder:</strong> ${leaderName}</p>
      </div>

      <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <h3 style="margin-top: 0; color: #0f172a; font-size: 16px;">Componentes da Equipe:</h3>
        <ul style="color: #475569; padding-left: 20px;">
          ${members.map(m => `<li>${m}</li>`).join('')}
        </ul>
      </div>

      <div style="margin-top: 25px; padding: 15px; background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px;">
        <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>Importante:</strong> Sua inscrição passará por uma revisão da coordenação esportiva. Mantenha o espírito esportivo e boa sorte!</p>
      </div>

      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">SISTEMA DE GESTÃO ESPORTIVA • CETEP LNAB</p>
    </div>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Jogos Escolares" <no-reply@cetep.edu.br>',
        to: email,
        subject,
        html,
      });
      return true;
    } catch (error) {
      console.error('Erro ao enviar e-mail dos jogos via SMTP:', error);
    }
  }

  if (resend) {
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM || 'onboarding@resend.dev',
        to: email,
        subject,
        html,
      });
      return true;
    } catch (error) {
      console.error('Erro ao enviar e-mail dos jogos via Resend:', error);
    }
  }

  return false;
}
export async function enviarEmailDocumentosJogos(email: string, teamName: string, teamId: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://ceteplnab.com.br';
  const uploadLink = `${baseUrl}/jogos/${teamId}/documentos`;
  const subject = `Inscrição Aprovada! Equipe ${teamName} - Envio de Documentos`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <h1 style="color: #0f172a; text-align: center;">Parabéns! 🎉</h1>
      <p style="color: #475569; font-size: 16px;">Sua equipe <strong>"${teamName}"</strong> foi aprovada na auditoria inicial (Frequência e Notas) para os Jogos Escolares.</p>
      
      <div style="background-color: #f8fafc; padding: 25px; border-radius: 12px; border: 2px dashed #cbd5e1; margin: 25px 0; text-align: center;">
        <h2 style="margin: 0 0 15px 0; color: #334155; font-size: 18px;">Último Passo: Documentação</h2>
        <p style="margin: 0 0 20px 0; color: #64748b; font-size: 14px; line-height: 1.5;">
          Para confirmar a participação da sua equipe, você precisa enviar as fotos (frente e verso) dos documentos de identidade dos alunos aprovados.
        </p>
        <a href="${uploadLink}" style="display: inline-block; background-color: #10b981; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);">
          Acessar Portal de Upload
        </a>
      </div>

      <p style="color: #ef4444; font-size: 13px; font-weight: bold; text-align: center;">Aviso: Sem o envio das identidades, a equipe não poderá competir.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">Organização Jogos Escolares CETEP/LNAB</p>
    </div>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Jogos Escolares" <ceteplnabsite@gmail.com>',
        to: email,
        subject,
        html,
      });
      return true;
    } catch (e) { console.error('SMTP erro', e); }
  } else if (resend) {
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM || 'onboarding@resend.dev',
        to: email,
        subject,
        html,
      });
      return true;
    } catch (e) { console.error('Resend erro', e); }
  }
  return false;
}
