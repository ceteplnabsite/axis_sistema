
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft, Plus, GraduationCap, Upload, Users, Accessibility, Pencil, FileText, Info, ShieldCheck } from "lucide-react"
import EstudantesFilter from "./EstudantesFilter"
import PortalActivationAction from "./PortalActivationAction"
import PortalActionsMenu from "./PortalActionsMenu"
import type { Prisma } from "@prisma/client"

export const metadata = {
  title: 'Áxis - Estudantes'
}

// Force recompile to pick up new Prisma schema types - v4.0.0
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type FiltrosEstudantes = {
  search?: string; cursoId?: string; turmaId?: string; turno?: string; serie?: string
  modalidade?: string; situacao?: string; turmaStatus?: string; aee?: string; portal?: string
  userId?: string; isDirecao?: boolean
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

async function getEstudantes(filters: FiltrosEstudantes) {
  const config = await prisma.globalConfig.findUnique({ where: { id: 'global' } })
  const currentYear = config?.anoLetivoAtual || new Date().getFullYear()

  const e: Prisma.EstudanteWhereInput[] = []

  // Sem busca por texto, só o ano letivo atual. Com busca, procura em qualquer ano (evita cadastro duplicado).
  if (!filters.search) e.push({ turma: { anoLetivo: currentYear } })

  // Professor vê só as turmas em que leciona
  if (!filters.isDirecao && filters.userId) {
    e.push({ turma: { OR: [
      { usuariosPermitidos: { some: { id: filters.userId } } },
      { disciplinas: { some: { usuariosPermitidos: { some: { id: filters.userId } } } } }
    ] } })
  }

  // Cada palavra precisa aparecer (em qualquer ordem), com ou sem acento; também acha pela matrícula
  if (filters.search) {
    for (const palavra of filters.search.trim().split(/\s+/).filter(Boolean).slice(0, 6)) {
      const variantes = [...new Set([palavra, semAcento(palavra)])]
      e.push({ OR: [
        ...variantes.map(v => ({ nome: { contains: v, mode: 'insensitive' as const } })),
        { matricula: { contains: palavra, mode: 'insensitive' as const } }
      ] })
    }
  }

  if (filters.turmaId) {
    e.push({ turmaId: filters.turmaId })
  } else {
    if (filters.cursoId) e.push({ turma: { OR: [{ cursoId: filters.cursoId }, { curso: filters.cursoId }] } })
    if (filters.turno) e.push({ turma: { turno: filters.turno } })
    if (filters.serie) e.push({ turma: { serie: { contains: filters.serie } } })
    if (filters.modalidade) e.push({ turma: { modalidade: filters.modalidade } })
    if (filters.turmaStatus === 'ATIVA' || filters.turmaStatus === 'ENCERRADA') e.push({ turma: { status: filters.turmaStatus } })
  }

  if (filters.situacao === 'ativos') e.push({ OR: [{ status: 'ATIVO' }, { status: null }] }, { turma: { nome: { not: 'Transferidos / Evasão' } } })
  if (filters.situacao === 'evasao') e.push({ OR: [{ status: 'REMOVIDO_VIA_VARREDURA' }, { turma: { nome: 'Transferidos / Evasão' } }] })
  if (filters.situacao === 'concluidos') e.push({ status: 'CONCLUIDO' })
  if (filters.aee === 'sim') e.push({ aeeProfile: { isNot: null } })
  if (filters.portal === 'sim') e.push({ portalAccess: { some: {} } })
  if (filters.portal === 'nao') e.push({ portalAccess: { none: {} } })

  const where: Prisma.EstudanteWhereInput = { AND: e }
  const total = await prisma.estudante.count({ where })

  const estudantes = await prisma.estudante.findMany({
    where,
    select: {
      matricula: true,
      nome: true,
      status: true,
      turma: {
        select: {
          id: true,
          nome: true,
          status: true
        }
      },
      aeeProfile: { select: { id: true } },
      portalAccess: { select: { id: true } },
      _count: {
        select: {
          notas: true
        }
      }
    },
    orderBy: {
      nome: 'asc'
    },
    take: 200
  })

  const portalUserIds = new Set(
    estudantes
      .filter(e => e.portalAccess.length > 0)
      .map(e => e.matricula)
  )

  return { estudantes, portalUserIds, total }
}

export default async function EstudantesPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  const resolvedParams = await searchParams
  const search = typeof resolvedParams.search === 'string' ? resolvedParams.search : undefined
  const cursoId = typeof resolvedParams.cursoId === 'string' ? resolvedParams.cursoId : undefined
  const turmaId = typeof resolvedParams.turmaId === 'string' ? resolvedParams.turmaId : undefined
  const turno = typeof resolvedParams.turno === 'string' ? resolvedParams.turno : undefined
  const serie = typeof resolvedParams.serie === 'string' ? resolvedParams.serie : undefined
  const texto = (k: string) => (typeof resolvedParams[k] === 'string' ? (resolvedParams[k] as string) : undefined)
  const modalidade = texto('modalidade'), situacao = texto('situacao'), turmaStatus = texto('turmaStatus'), aee = texto('aee'), portal = texto('portal')

  const isDirecao = session.user.isSuperuser || session.user.isDirecao
  const hasFilters = !!(search || cursoId || turmaId || turno || serie || modalidade || situacao || turmaStatus || aee || portal)

  // Utilizando cast 'any' para evitar erros de lint stale com o cliente Prisma gerado
  const [dbCursos, turmas] = await Promise.all([
    (prisma as any).curso.findMany({
      select: { id: true, nome: true, modalidade: true },
      orderBy: { nome: 'asc' }
    }),
    (prisma as any).turma.findMany({
      where: {
        anoLetivo: (await prisma.globalConfig.findUnique({ where: { id: 'global' } }))?.anoLetivoAtual || new Date().getFullYear(),
        ...(isDirecao ? {} : {
          OR: [
            { usuariosPermitidos: { some: { id: session.user.id } } },
            { disciplinas: { some: { usuariosPermitidos: { some: { id: session.user.id } } } } }
          ]
        })
      },
      select: { id: true, nome: true, cursoId: true, turno: true, curso: true, serie: true, modalidade: true, status: true },
      orderBy: { nome: 'asc' }
    })
  ])

  // Busca de estudantes apenas se houver filtros para não sobrecarregar
  const { estudantes, portalUserIds, total } = hasFilters
    ? await getEstudantes({ search, cursoId, turmaId, turno, serie, modalidade, situacao, turmaStatus, aee, portal, userId: session.user.id, isDirecao })
    : { estudantes: [], portalUserIds: new Set<string>(), total: 0 }

  // Combinar cursos do banco (novos) com cursos legados (strings nas turmas)
  const legacyCursos = Array.from(new Set(
    turmas
      .filter((t: any) => t.curso && !t.cursoId)
      .map((t: any) => t.curso)
  )).map(nome => ({ id: nome as string, nome: nome as string }))

  const cursos = [...dbCursos, ...legacyCursos]
    .map(c => ({
      id: c.id,
      nome: (c as any).modalidade ? `${c.nome} (${(c as any).modalidade})` : c.nome
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome))

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Premium Estilo Resultados - Ajustado para ser Flush com o Layout */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-300 sticky top-0 z-50 -mx-4 -mt-4 md:-mx-8 md:-mt-8 mb-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto py-4">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex items-center space-x-5">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-700"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Estudantes</h1>
                <p className="text-base text-slate-700 font-medium">Gerenciar cadastro de alunos</p>
              </div>
            </div>
            
            <div className={`grid grid-cols-2 md:flex md:items-center gap-2 ${(!session.user.isSuperuser && !session.user.isDirecao) ? 'hidden' : ''}`}>
              <Link
                href="/dashboard/aee"
                className="flex items-center justify-center space-x-2 bg-indigo-50 text-indigo-700 px-3 md:px-4 py-2.5 rounded-lg hover:bg-indigo-100 transition-all border border-indigo-200 shadow-sm text-sm font-bold"
              >
                <Accessibility className="w-4 h-4" />
                <span className="whitespace-nowrap">Painel AEE</span>
              </Link>
              <div className="hidden md:block w-px h-6 bg-slate-200 mx-1" />
              <div className="col-span-2 md:col-auto">
                <PortalActionsMenu />
              </div>
              <div className="hidden md:block w-px h-6 bg-slate-300 mx-1" />
              <Link
                href="/dashboard/estudantes/importar"
                className="flex items-center justify-center space-x-2 bg-slate-700 text-white px-3 md:px-4 py-2.5 rounded-lg hover:bg-slate-800 transition-all shadow-sm text-sm font-medium"
              >
                <Upload className="w-4 h-4" />
                <span className="whitespace-nowrap">Importar</span>
              </Link>
              <Link
                href="/dashboard/estudantes/novo"
                className="flex items-center justify-center space-x-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-3 md:px-4 py-2.5 rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-sm text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span className="whitespace-nowrap">Novo Aluno</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32">
        {/* Legenda de Ícones - NOVO */}
        <div className="bg-white/50 backdrop-blur p-4 rounded-3xl border border-white/50 shadow-sm flex flex-wrap items-center justify-center gap-8 mb-6">
           <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-100 text-slate-500 rounded-lg border border-slate-200">
                 <ShieldCheck size={14} />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Gestão de Acesso</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-100 text-slate-500 rounded-lg border border-slate-200">
                 <Pencil size={14} />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Editar Dados</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 text-indigo-500 rounded-lg border border-indigo-200">
                 <Accessibility size={14} />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Ficha AEE</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-100 text-slate-500 rounded-lg border border-slate-200">
                 <FileText size={14} />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Gerar Boletim</span>
           </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-300/40 border border-slate-200 overflow-hidden mb-6">
           <EstudantesFilter cursos={cursos} turmas={turmas} totalResults={total} exibidos={estudantes.length} />
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-300/50 border border-slate-200 overflow-hidden">
          {estudantes.length === 0 ? (
            <div className="p-12 text-center">
              <GraduationCap className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">
                {hasFilters ? 'Nenhum estudante encontrado' : 'Pesquise por estudantes'}
              </h3>
              <p className="text-slate-700 mb-6">
                {hasFilters 
                  ? 'Tente ajustar os filtros de busca' 
                  : 'Utilize a busca ou os filtros acima para carregar a lista de estudantes sem sobrecarregar o sistema.'}
              </p>
              {!hasFilters && (
                <div className="flex justify-center gap-4">
                  <Link
                    href="/dashboard/estudantes/novo"
                    className="inline-flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Adicionar Estudante</span>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col">
              {Object.entries(
                // agrupa pela turma (id): turmas encerradas e ativas podem ter o mesmo nome
                estudantes.reduce((acc: Record<string, typeof estudantes>, estudante) => {
                  const chave = estudante.turma?.id ?? 'sem-turma'
                  ;(acc[chave] ??= []).push(estudante)
                  return acc
                }, {})
              ).map(([turmaId, lista]) => ({ turmaId, lista, nome: lista[0].turma?.nome || 'Sem Turma', encerrada: lista[0].turma?.status === 'ENCERRADA' }))
              .sort((a, b) => Number(a.encerrada) - Number(b.encerrada) || a.nome.localeCompare(b.nome))
              .map(({ turmaId, nome: turmaNome, encerrada, lista: estudantesDaTurma }) => (
                <div key={turmaId} className="mb-0 border-b-8 border-slate-100 last:border-0">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <Users className="w-5 h-5 text-slate-400" />
                      {turmaNome}
                      {encerrada && <span className="text-[10px] normal-case tracking-normal text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">encerrada</span>}
                    </h2>
                    <span className="text-xs font-bold text-slate-500 bg-slate-200 px-3 py-1 rounded-full">{estudantesDaTurma.length} estudantes</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Nome
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Notas Lançadas
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Ações / Gestão
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {estudantesDaTurma.map((estudante) => (
                          <tr key={estudante.matricula} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-slate-800 rounded-2xl flex items-center justify-center text-white font-bold shadow-md">
                                  {estudante.nome.charAt(0).toUpperCase()}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                    {estudante.nome}
                                    {estudante.status && estudante.status !== 'ATIVO' && (
                                      <span className="text-[10px] normal-case tracking-normal text-slate-600 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">
                                        {estudante.status === 'REMOVIDO_VIA_VARREDURA' ? 'transferido / evasão' : estudante.status === 'CONCLUIDO' ? 'concluído' : estudante.status.toLowerCase()}
                                      </span>
                                    )}
                                    {estudante.aeeProfile && (
                                      <Link 
                                        href={`/dashboard/aee/${estudante.matricula}`}
                                        className="p-1 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                        title="Aluno com Atendimento Especializado (AEE)"
                                      >
                                        <Accessibility className="w-3.5 h-3.5" />
                                      </Link>
                                    )}
                                  </div>
                                  <div className="text-[11px] font-bold tracking-widest text-slate-400 uppercase mt-0.5">
                                    Matrícula: {estudante.matricula}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-600">
                              {estudante._count.notas}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                               <div className="flex items-center justify-end gap-2">
                                  {/* Icone Gestão de Acesso */}
                                  <PortalActivationAction 
                                      estudanteId={estudante.matricula} 
                                      initialMatricula={estudante.matricula}
                                      hasUser={portalUserIds.has(estudante.matricula)}
                                  />

                                  <Link
                                    href={`/dashboard/estudantes/${estudante.matricula}/editar`}
                                    className="p-2 bg-slate-50 text-slate-400 border border-slate-200 rounded-xl hover:text-slate-900 hover:bg-white transition-all shadow-sm"
                                    title="Editar Dados"
                                  >
                                    <Pencil size={18} />
                                  </Link>

                                  {/* Link Direto AEE - Apenas se já existir perfil */}
                                  {estudante.aeeProfile && (
                                    <Link
                                      href={`/dashboard/aee/${estudante.matricula}`}
                                      className="p-2 bg-indigo-50 text-indigo-500 border border-indigo-100 rounded-xl hover:text-indigo-900 hover:bg-white transition-all shadow-sm"
                                      title="Ficha AEE"
                                    >
                                      <Accessibility size={18} />
                                    </Link>
                                  )}

                                  <Link
                                    href={`/dashboard/estudantes/${estudante.matricula}/boletim`}
                                    className="p-2 bg-slate-50 text-slate-400 border border-slate-200 rounded-xl hover:text-slate-900 hover:bg-white transition-all shadow-sm"
                                    title="Gerar Boletim"
                                  >
                                    <FileText size={18} />
                                  </Link>
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
