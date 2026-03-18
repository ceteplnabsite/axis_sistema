import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft, Download, FileText } from "lucide-react"

export const metadata = {
  title: 'Áxis - Turmas'
}

export const runtime = 'nodejs'

async function getTurmaRelatorio(id: string) {
  return await prisma.turma.findUnique({
    where: { id },
    include: {
      estudantes: {
        include: {
          notas: {
            include: {
              disciplina: true
            }
          }
        },
        orderBy: {
          nome: 'asc'
        }
      },
      disciplinas: {
        orderBy: {
          nome: 'asc'
        }
      }
    }
  })
}

export default async function RelatorioTurmaPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  const { id } = await params
  const turma = await getTurmaRelatorio(id)

  if (!turma) {
    redirect("/dashboard/turmas")
  }

  // Calcular estatísticas
  const totalEstudantes = turma.estudantes.length
  const totalDisciplinas = turma.disciplinas.length
  
  let totalAprovados = 0
  let totalRecuperacao = 0
  let totalDesistentes = 0

  turma.estudantes.forEach((estudante: any) => {
    const aprovadas = estudante.notas.filter((n: any) => n.status === 'APROVADO').length
    const recuperacao = estudante.notas.filter((n: any) => n.status === 'RECUPERACAO').length
    const desistente = estudante.notas.filter((n: any) => n.status === 'DESISTENTE').length

    if (desistente > 0) {
      totalDesistentes++
    } else if (recuperacao > 0) {
      totalRecuperacao++
    } else if (aprovadas === totalDisciplinas) {
      totalAprovados++
    }
  })

  const isProfessorOnly = session.user.isStaff && !session.user.isDirecao && !session.user.isSuperuser

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard/turmas"
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                title="Voltar para Turmas"
              >
                <ArrowLeft className="w-5 h-5 text-slate-700" />
              </Link>
              <div>
                <h1 className="text-2xl font-medium text-blue-900">
                  {isProfessorOnly ? 'Relação de Estudantes' : 'Relatório da Turma'}
                </h1>
                <p className="text-sm text-slate-700">{turma.nome}</p>
              </div>
            </div>
            
            {!isProfessorOnly && (
              <a
                href={`/api/relatorio/turma/${turma.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 bg-gradient-to-r from-slate-700 to-slate-600 text-white px-4 py-2 rounded-lg hover:from-slate-800 hover:to-slate-700 transition-all shadow-lg"
              >
                <Download className="w-5 h-5" />
                <span>Baixar PDF Global</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estatísticas - Apenas para Direção/Superuser */}
        {!isProfessorOnly && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-slate-100 border border-slate-300 rounded-xl p-6">
              <p className="text-sm text-slate-800 mb-1">Total de Estudantes</p>
              <p className="text-3xl font-medium text-blue-900">{totalEstudantes}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <p className="text-sm text-green-700 mb-1">Aprovados</p>
              <p className="text-3xl font-medium text-green-900">{totalAprovados}</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
              <p className="text-sm text-orange-700 mb-1">Em Recuperação</p>
              <p className="text-3xl font-medium text-orange-900">{totalRecuperacao}</p>
            </div>
            <div className="bg-slate-100 border border-slate-300 rounded-xl p-6">
              <p className="text-sm text-slate-800 mb-1">Desistentes</p>
              <p className="text-3xl font-medium text-blue-900">{totalDesistentes}</p>
            </div>
          </div>
        )}

        {isProfessorOnly && (
          <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-blue-900">Contagem de Alunos</h2>
              <p className="text-sm text-blue-700">Total de estudantes matriculados nesta turma</p>
            </div>
            <div className="text-4xl font-black text-blue-900 pr-4">
              {totalEstudantes}
            </div>
          </div>
        )}

        {/* Lista de Estudantes */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-300 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-50 border-b border-slate-300">
            <h3 className="text-lg font-medium text-blue-900">
              {isProfessorOnly ? 'Estudantes Matriculados' : 'Estudantes e Desempenho'}
            </h3>
          </div>

          {turma.estudantes.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <p className="text-slate-700">Nenhum estudante cadastrado nesta turma</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100 border-b border-slate-300">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Estudante
                    </th>
                    {!isProfessorOnly && (
                      <>
                        <th className="px-6 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
                          Notas Lançadas
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
                          Média
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
                          Aprovado
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
                          Recuperação
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
                          Status
                        </th>
                      </>
                    )}
                    {isProfessorOnly && (
                      <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider text-right pr-12">
                         Matrícula
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-300">
                  {turma.estudantes.map((estudante: any, index: number) => {
                    const aprovadas = estudante.notas.filter((n: any) => n.status === 'APROVADO').length
                    const recuperacao = estudante.notas.filter((n: any) => n.status === 'RECUPERACAO').length
                    const desistente = estudante.notas.some((n: any) => n.status === 'DESISTENTE')
                    const media = estudante.notas.length > 0
                      ? (estudante.notas.reduce((acc: number, n: any) => acc + n.nota, 0) / estudante.notas.length).toFixed(2)
                      : '0.00'

                    let statusText = 'Pendente'
                    let statusColor = 'text-slate-800 bg-slate-200'

                    if (desistente) {
                      statusText = 'Desistente'
                      statusColor = 'text-slate-800 bg-slate-200'
                    } else if (recuperacao > 0) {
                      statusText = 'Recuperação'
                      statusColor = 'text-orange-700 bg-orange-100'
                    } else if (aprovadas === totalDisciplinas && totalDisciplinas > 0) {
                      statusText = 'Aprovado'
                      statusColor = 'text-green-700 bg-green-100'
                    }

                    return (
                      <tr key={estudante.matricula} className="hover:bg-slate-100 transition-colors">
                        <td className="px-6 py-4 text-xs font-bold text-slate-400">
                           {index + 1}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-slate-800 rounded-2xl flex items-center justify-center text-white font-bold shadow-md">
                              {estudante.nome.charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-bold text-slate-800 uppercase tracking-tight">
                                {estudante.nome}
                              </div>
                              {isProfessorOnly && (
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 md:hidden">
                                  {estudante.matricula}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        {!isProfessorOnly && (
                          <>
                            <td className="px-6 py-4 text-center text-sm font-bold text-slate-700">
                              {estudante.notas.length}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm font-bold text-slate-700">{media}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm font-bold text-green-600">{aprovadas}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm font-bold text-orange-600">{recuperacao}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${statusColor} uppercase tracking-widest`}>
                                {statusText}
                              </span>
                            </td>
                          </>
                        )}
                        {isProfessorOnly && (
                           <td className="px-6 py-4 text-right text-sm font-bold text-slate-500 font-mono tracking-widest pr-12 hidden md:table-cell">
                              {estudante.matricula}
                           </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
