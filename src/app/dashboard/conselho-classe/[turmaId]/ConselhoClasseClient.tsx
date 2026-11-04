"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Save, Printer, X, Search, Mail, CheckCircle2, AlertTriangle,
  Loader2, Lock, Undo2, Info, Send, Pencil, WifiOff, RotateCcw
} from "lucide-react"
import { aprovadoNaRecuperacao, NOTA_MINIMA, notaDaUnidade, unidadesDaTurma, type Unidade } from "@/lib/conselho"

export interface ItemConselho {
  key: string
  notaId: string | null
  estudanteId: string
  estudanteNome: string
  disciplinaId: string
  disciplinaNome: string
  professores: string[]
  nota1: number | null
  nota2: number | null
  nota3: number | null
  media: number | null
  notaRecuperacao: number | null
  status: string // StatusNota ou 'SEM_NOTA'
  unidadesFaltando: Unidade[]
  infrequente: Unidade[]
}

type Destinatario = { nome: string; email: string; ativo: boolean; disciplinas: { disciplina: string; alunosPendentes: number }[] }
type ResultadoAviso = { nome: string; email: string; resultado: 'smtp' | 'resend' | 'simulado' | 'erro' | 'inativo' }
type DadosAviso = { turma: string; destinatarios?: Destinatario[]; resultados?: ResultadoAviso[]; semProfessor: string[] }

type Categoria = 'decidir' | 'aguardando' | 'resolvido'
type Filtro = 'todos' | Categoria

const RESOLVIDOS = ['APROVADO_RECUPERACAO', 'APROVADO_CONSELHO', 'DEPENDENCIA', 'CONSERVADO']

const DECISOES = [
  { value: 'APROVADO_CONSELHO', curto: 'Aprov. Conselho' },
  { value: 'DEPENDENCIA', curto: 'Dependência' },
  { value: 'CONSERVADO', curto: 'Conservado' },
] as const

type Tom = 'amber' | 'emerald' | 'slate' | 'rose'
const STATUS_TOM: Record<string, Tom> = {
  APROVADO_CONSELHO: 'emerald',
  DEPENDENCIA: 'slate',
  CONSERVADO: 'rose',
}
const AUTO_SAVE_MS = 1500 // espera após o último clique antes de gravar o aluno concluído

type Rascunho = { decisoes: Record<string, string>; recs: Record<string, number | null>; salvoEm: string }

const STATUS_LABEL: Record<string, string> = {
  APROVADO: 'Aprovado',
  RECUPERACAO: 'Recuperação',
  DESISTENTE: 'Infrequente',
  APROVADO_RECUPERACAO: 'Aprovado na Recuperação',
  APROVADO_CONSELHO: 'Aprovado pelo Conselho',
  DEPENDENCIA: 'Dependência',
  CONSERVADO: 'Conservado',
  SEM_NOTA: 'Sem nota',
}

const unidadesTexto = (us: number[]) => us.map(u => `${u}ª`).join(', ').replace(/, ([^,]*)$/, ' e $1')
const fmt = (n: number | null | undefined) => (n === null || n === undefined ? '—' : n === -1 ? 'NR' : n.toFixed(1))

export default function ConselhoClasseClient({
  turmaId, turmaNome, turmaCurso, turmaTurno, semestral, encerrada, ehDirecao, itens
}: {
  turmaId: string
  turmaNome: string
  turmaCurso?: string | null
  turmaTurno?: string | null
  semestral: boolean
  encerrada: boolean
  /** Direção/admin: pode avisar professores e lançar notas durante o Conselho */
  ehDirecao: boolean
  itens: ItemConselho[]
}) {
  const router = useRouter()
  const [decisoes, setDecisoes] = useState<Record<string, string>>({})
  const [recs, setRecs] = useState<Record<string, number | null>>({})
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busca, setBusca] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [revisar, setRevisar] = useState(false)
  const [conservar, setConservar] = useState<ItemConselho | null>(null)
  const [mostrarGuia, setMostrarGuia] = useState(false)
  const [editarNotas, setEditarNotas] = useState<ItemConselho | null>(null)
  const [aviso, setAviso] = useState<{ etapa: 'carregando' | 'previa' | 'enviando' | 'feito' | 'erro'; dados?: DadosAviso; erro?: string } | null>(null)
  const [editando, setEditando] = useState<Set<string>>(new Set())
  const [online, setOnline] = useState(true)
  const [rascunhoSalvo, setRascunhoSalvo] = useState<{ total: number; quando: string; dados: Rascunho } | null>(null)
  const [ultimoRascunho, setUltimoRascunho] = useState<string | null>(null)
  const [rascunhoCarregado, setRascunhoCarregado] = useState(false)
  const [estadoAluno, setEstadoAluno] = useState<Record<string, { fase: 'salvando' | 'gravado' | 'erro'; quando?: string; erro?: string }>>({})
  const [tentativa, setTentativa] = useState(0)
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const enviados = useRef<Record<string, string>>({}) // aluno → assinatura do que já foi enviado
  const unidades = unidadesDaTurma(semestral)
  const chaveRascunho = `axis:conselho:rascunho:${turmaId}`
  const horaCurta = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  // ── rascunho local: nada se perde se a internet cair, a página recarregar ou a sessão expirar ──
  useEffect(() => {
    try {
      const bruto = localStorage.getItem(chaveRascunho)
      if (bruto) {
        const dados = JSON.parse(bruto) as Rascunho
        const total = Object.keys(dados.decisoes ?? {}).length + Object.keys(dados.recs ?? {}).length
        if (total) setRascunhoSalvo({ total, quando: horaCurta(dados.salvoEm), dados })
      }
    } catch { /* rascunho corrompido: ignora */ }
    setRascunhoCarregado(true)
   
  }, [chaveRascunho])

  useEffect(() => {
    if (!rascunhoCarregado || rascunhoSalvo) return // não sobrescreve um rascunho ainda não restaurado/descartado
    const total = Object.keys(decisoes).length + Object.keys(recs).length
    try {
      if (total) {
        const salvoEm = new Date().toISOString()
        localStorage.setItem(chaveRascunho, JSON.stringify({ decisoes, recs, salvoEm } satisfies Rascunho))
        setUltimoRascunho(horaCurta(salvoEm))
      } else {
        localStorage.removeItem(chaveRascunho)
        setUltimoRascunho(null)
      }
    } catch { /* armazenamento indisponível */ }
   
  }, [decisoes, recs, rascunhoCarregado, rascunhoSalvo, chaveRascunho])

  useEffect(() => {
    const atualizar = () => setOnline(navigator.onLine)
    atualizar()
    window.addEventListener('online', atualizar)
    window.addEventListener('offline', atualizar)
    return () => { window.removeEventListener('online', atualizar); window.removeEventListener('offline', atualizar) }
  }, [])

  const temAlteracoes = Object.keys(decisoes).length + Object.keys(recs).length > 0
  useEffect(() => {
    if (!temAlteracoes) return
    const avisar = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [temAlteracoes])

  const restaurarRascunho = () => {
    if (!rascunhoSalvo) return
    const validas = new Set(itens.filter(i => i.notaId && i.unidadesFaltando.length === 0).map(i => i.key))
    const filtra = <T,>(o: Record<string, T>) => Object.fromEntries(Object.entries(o ?? {}).filter(([k]) => validas.has(k)))
    setDecisoes(filtra(rascunhoSalvo.dados.decisoes))
    setRecs(filtra(rascunhoSalvo.dados.recs))
    setRascunhoSalvo(null)
    setMensagem({ tipo: 'ok', texto: 'Rascunho restaurado. Revise e grave quando estiver pronto.' })
  }
  const descartarRascunho = () => {
    try { localStorage.removeItem(chaveRascunho) } catch { /* ignora */ }
    setRascunhoSalvo(null)
  }

  // ── regras (mesmas do servidor, em src/lib/conselho.ts) ──
  const recAtual = (i: ItemConselho) => (i.key in recs ? recs[i.key] : i.notaRecuperacao)
  const pendente = (i: ItemConselho) => i.unidadesFaltando.length > 0
  const statusFinal = (i: ItemConselho) => {
    if (pendente(i)) return i.status
    if (aprovadoNaRecuperacao(recAtual(i))) return 'APROVADO_RECUPERACAO'
    if (decisoes[i.key]) return decisoes[i.key]
    if (i.status === 'APROVADO_RECUPERACAO') return 'RECUPERACAO' // recuperação corrigida para baixo de 5
    return i.status
  }
  const categoria = (i: ItemConselho): Categoria =>
    pendente(i) ? 'aguardando' : RESOLVIDOS.includes(statusFinal(i)) ? 'resolvido' : 'decidir'

  const alteracoes = useMemo(() => itens
    .filter(i => i.notaId && !pendente(i))
    .map(i => ({ item: i, novoStatus: statusFinal(i), novaNotaRec: recAtual(i) }))
    .filter(a => a.novoStatus !== a.item.status || a.novaNotaRec !== a.item.notaRecuperacao),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [itens, decisoes, recs])

  // ── agrupamentos ──
  const alunos = useMemo(() => {
    const m = new Map<string, { id: string; nome: string; itens: ItemConselho[] }>()
    for (const i of itens) {
      if (!m.has(i.estudanteId)) m.set(i.estudanteId, { id: i.estudanteId, nome: i.estudanteNome, itens: [] })
      m.get(i.estudanteId)!.itens.push(i)
    }
    return [...m.values()].sort((a, b) => a.nome.localeCompare(b.nome))
  }, [itens])

  const contagem = { decidir: 0, aguardando: 0, resolvido: 0 }
  for (const i of itens) contagem[categoria(i)]++
  const decidiveis = contagem.decidir + contagem.resolvido
  const progresso = decidiveis ? Math.round((contagem.resolvido / decidiveis) * 100) : 100

  const pendenciasPorDisciplina = useMemo(() => {
    const m = new Map<string, { disciplina: string; professores: string[]; alunos: number; unidades: Set<number> }>()
    for (const i of itens.filter(pendente)) {
      if (!m.has(i.disciplinaId)) m.set(i.disciplinaId, { disciplina: i.disciplinaNome, professores: i.professores, alunos: 0, unidades: new Set() })
      const p = m.get(i.disciplinaId)!
      p.alunos++
      i.unidadesFaltando.forEach(u => p.unidades.add(u))
    }
    return [...m.values()].sort((a, b) => b.alunos - a.alunos)
   
  }, [itens])

  const alunosVisiveis = alunos
    .filter(a => a.nome.toLowerCase().includes(busca.trim().toLowerCase()))
    .filter(a => filtro === 'todos' || a.itens.some(i => categoria(i) === filtro))

  // ── gravação automática: aluno concluído (nada mais "para decidir") é gravado sozinho ──
  const salvarAluno = async (alunoId: string, payload: { notaId: string | null; novoStatus: string; novaNotaRec: number | null }[], assinatura: string) => {
    enviados.current[alunoId] = assinatura
    setEstadoAluno(e => ({ ...e, [alunoId]: { fase: 'salvando' } }))
    try {
      const r = await fetch('/api/conselho-classe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisoes: payload }) })
      const body = await r.json().catch(() => ({}))
      if (r.ok) {
        setEstadoAluno(e => ({ ...e, [alunoId]: { fase: 'gravado', quando: horaCurta(new Date().toISOString()) } }))
        router.refresh()
        return
      }
      delete enviados.current[alunoId]
      const erro = r.status === 401 ? 'Sessão expirada — entre novamente; as alterações estão guardadas neste computador.' : (body.message || 'Erro ao gravar')
      setEstadoAluno(e => ({ ...e, [alunoId]: { fase: 'erro', erro } }))
    } catch {
      delete enviados.current[alunoId]
      setEstadoAluno(e => ({ ...e, [alunoId]: { fase: 'erro', erro: 'Sem conexão — será gravado quando a internet voltar.' } }))
    }
  }

  useEffect(() => {
    if (encerrada || !rascunhoCarregado || rascunhoSalvo) return
    for (const aluno of alunos) {
      const pend = alteracoes.filter(a => a.item.estudanteId === aluno.id)
      const concluido = !aluno.itens.some(i => categoria(i) === 'decidir')
      if (timers.current[aluno.id]) { clearTimeout(timers.current[aluno.id]); delete timers.current[aluno.id] }
      if (!pend.length || !concluido || !online) continue
      const payload = pend.map(a => ({ notaId: a.item.notaId, novoStatus: a.novoStatus, novaNotaRec: a.novaNotaRec }))
      const assinatura = JSON.stringify(payload)
      if (enviados.current[aluno.id] === assinatura) continue // já enviado, aguardando a tela atualizar
      timers.current[aluno.id] = setTimeout(() => { delete timers.current[aluno.id]; salvarAluno(aluno.id, payload, assinatura) }, AUTO_SAVE_MS)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alteracoes, online, tentativa, rascunhoCarregado, rascunhoSalvo])

  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), [])

  // quando a tela recarrega do servidor, tira do rascunho o que já está gravado
  useEffect(() => {
    const porKey = new Map(itens.map(i => [i.key, i]))
    setDecisoes(prev => {
      const n = Object.fromEntries(Object.entries(prev).filter(([k, v]) => porKey.has(k) && porKey.get(k)!.status !== v))
      return Object.keys(n).length === Object.keys(prev).length ? prev : n
    })
    setRecs(prev => {
      const n = Object.fromEntries(Object.entries(prev).filter(([k, v]) => porKey.has(k) && porKey.get(k)!.notaRecuperacao !== v))
      return Object.keys(n).length === Object.keys(prev).length ? prev : n
    })
  }, [itens])

  const tentarDeNovo = (alunoId: string) => {
    delete enviados.current[alunoId]
    setEstadoAluno(e => { const n = { ...e }; delete n[alunoId]; return n })
    setTentativa(t => t + 1)
  }

  // ── ações ──
  const escolher = (i: ItemConselho, valor: string) => {
    if (valor === 'CONSERVADO' && decisoes[i.key] !== 'CONSERVADO') { setConservar(i); return }
    setDecisoes(prev => {
      const next = { ...prev }
      if (next[i.key] === valor) delete next[i.key] // clicar de novo desmarca
      else next[i.key] = valor
      return next
    })
    setEditando(s => { const n = new Set(s); n.delete(i.key); return n })
  }

  /** Volta a decisão desta disciplina para o que está gravado no sistema */
  const desfazerDecisao = (i: ItemConselho) => {
    setDecisoes(prev => { const n = { ...prev }; delete n[i.key]; return n })
    setEditando(s => { const n = new Set(s); n.delete(i.key); return n })
  }

  const aplicarConservado = (i: ItemConselho, todas: boolean) => {
    const alvo = todas
      ? itens.filter(x => x.estudanteId === i.estudanteId && !pendente(x) && x.notaId && !aprovadoNaRecuperacao(recAtual(x)))
      : [i]
    setDecisoes(prev => ({ ...prev, ...Object.fromEntries(alvo.map(x => [x.key, 'CONSERVADO'])) }))
    setEditando(s => { const n = new Set(s); alvo.forEach(x => n.delete(x.key)); return n })
    setConservar(null)
  }

  const mudarRec = (i: ItemConselho, texto: string) => {
    const t = texto.trim().replace(',', '.')
    const valor = t === '' ? null : t.toUpperCase() === 'NR' ? -1 : Number(t)
    if (valor !== null && (isNaN(valor) || (valor !== -1 && (valor < 0 || valor > 10)))) {
      setMensagem({ tipo: 'erro', texto: `Nota de recuperação inválida para ${i.estudanteNome} — use 0 a 10 (ou NR para "não realizou").` })
      return
    }
    setRecs(prev => ({ ...prev, [i.key]: valor }))
  }

  const descartar = () => {
    Object.values(timers.current).forEach(clearTimeout); timers.current = {}
    setDecisoes({}); setRecs({}); setEditando(new Set())
  }

  const gravar = async () => {
    setSalvando(true); setRevisar(false); setMensagem(null)
    try {
      const r = await fetch('/api/conselho-classe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisoes: alteracoes.map(a => ({ notaId: a.item.notaId, novoStatus: a.novoStatus, novaNotaRec: a.novaNotaRec })) })
      })
      const body = await r.json().catch(() => ({}))
      if (r.ok) {
        setMensagem({ tipo: 'ok', texto: `${body.count} decisão(ões) gravada(s) com sucesso.` })
        setEditando(new Set())
        router.refresh() // o rascunho se limpa sozinho quando a tela recarrega
      } else if (r.status === 401) {
        setMensagem({ tipo: 'erro', texto: 'Sua sessão expirou. Entre novamente no sistema — as alterações ficaram guardadas neste computador e poderão ser restauradas.' })
      } else {
        setMensagem({ tipo: 'erro', texto: `${body.message || 'Erro ao gravar as decisões.'} Nada foi gravado — suas alterações continuam na tela.` })
      }
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Sem conexão com o servidor. Nada foi gravado — suas alterações estão guardadas neste computador; tente de novo quando a internet voltar.' })
    } finally {
      setSalvando(false)
    }
  }

  const abrirAviso = async () => {
    setAviso({ etapa: 'carregando' })
    try {
      const r = await fetch('/api/conselho-classe/avisar-professores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ turmaId, simular: true }) })
      const dados = await r.json()
      setAviso(r.ok ? { etapa: 'previa', dados } : { etapa: 'erro', erro: dados.message })
    } catch { setAviso({ etapa: 'erro', erro: 'Sem conexão com o servidor.' }) }
  }
  const enviarAviso = async () => {
    setAviso(a => ({ ...a!, etapa: 'enviando' }))
    try {
      const r = await fetch('/api/conselho-classe/avisar-professores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ turmaId, simular: false }) })
      const dados = await r.json()
      setAviso(r.ok ? { etapa: 'feito', dados } : { etapa: 'erro', erro: dados.message })
    } catch { setAviso({ etapa: 'erro', erro: 'Sem conexão com o servidor.' }) }
  }

  const imprimir = () => {
    const t = document.title
    document.title = `Conselho-Classe-${turmaNome.replace(/\s+/g, '-')}`
    window.print()
    document.title = t
  }

  // ── impressão (tabela aluno × disciplina) ──
  const disciplinasImpressao = Array.from(new Set(itens.map(i => i.disciplinaNome))).sort()
  const siglaImpressao = (i: ItemConselho) => {
    if (pendente(i)) return { s: 'AN', c: 'bg-amber-50 text-amber-900' }
    switch (statusFinal(i)) {
      case 'APROVADO_RECUPERACAO': return { s: 'AR', c: 'bg-emerald-100 text-emerald-900' }
      case 'APROVADO_CONSELHO': return { s: 'AC', c: 'bg-emerald-200 text-emerald-900' }
      case 'DEPENDENCIA': return { s: 'DP', c: 'bg-slate-200 text-slate-900' }
      case 'CONSERVADO': return { s: 'CO', c: 'bg-rose-100 text-rose-900' }
      default: return { s: 'RC', c: 'bg-orange-50 text-orange-900' }
    }
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          @page { size: landscape; margin: 1.5cm 1cm; }
          body { background: white !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
        .print-only { display: none; }
      `}</style>

      {/* ───────── Impressão ───────── */}
      <div className="print-only p-6 bg-white">
        <div className="mb-3 flex items-start justify-between gap-6">
          <div>
            <p className="text-[9px] font-medium text-slate-700 uppercase">Centro Territorial de Educação Profissional do Litoral Norte e Agreste Baiano</p>
            <h1 className="text-xl font-medium text-slate-900">Conselho de Classe Final — {turmaNome}</h1>
            {turmaCurso && <p className="text-sm text-slate-700">{turmaCurso}{turmaTurno && ` — ${turmaTurno}`}</p>}
            <p className="text-xs text-slate-400">Impresso em {new Date().toLocaleString('pt-BR')}</p>
          </div>
          <div className="text-[8px] border border-slate-300 rounded px-3 py-2 space-x-3">
            <b>LEGENDA:</b> <span>AR Aprov. Recuperação</span> <span>AC Aprov. Conselho</span> <span>DP Dependência</span>
            <span>CO Conservado</span> <span>RC Recuperação</span> <span>AN Aguardando nota</span>
          </div>
        </div>
        <table className="w-full border-collapse text-[9px]">
          <thead>
            <tr>
              <th className="border border-slate-400 px-2 text-left" style={{ width: 140 }}>ESTUDANTE</th>
              {disciplinasImpressao.map(d => (
                <th key={d} className="border border-slate-400" style={{ height: 100, width: 22 }}>
                  <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 7, fontWeight: 900, margin: '0 auto', whiteSpace: 'nowrap' }}>{d.toUpperCase().slice(0, 24)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alunos.map((a, idx) => (
              <tr key={a.id}>
                <td className="border border-slate-400 px-2 py-0.5 text-[10px]"><span className="text-slate-500 mr-1">{String(idx + 1).padStart(2, '0')}</span>{a.nome}</td>
                {disciplinasImpressao.map(d => {
                  const i = a.itens.find(x => x.disciplinaNome === d)
                  if (!i) return <td key={d} className="border border-slate-400 text-center">—</td>
                  const { s, c } = siglaImpressao(i)
                  const rec = recAtual(i)
                  return (
                    <td key={d} className={`border border-slate-400 text-center ${c}`}>
                      <div className="leading-tight"><div className="text-[8px] font-bold">{s}</div>{rec !== null && rec !== undefined && <div>{fmt(rec)}</div>}</div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ───────── Tela ───────── */}
      <div className="min-h-screen bg-slate-50 no-print -mx-4 -mt-4 md:-mx-8 md:-mt-8 px-4 md:px-8 pt-4 md:pt-6">
        <div className="max-w-6xl mx-auto pb-36 space-y-5">

          {/* Cabeçalho */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/conselho-classe" className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-800" aria-label="Voltar">
                <ArrowLeft size={22} />
              </Link>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{turmaNome}</h1>
                  {turmaTurno && <span className="px-2 py-0.5 rounded-md border border-slate-300 text-slate-600 text-xs font-medium">{turmaTurno}</span>}
                  <span className="px-2 py-0.5 rounded-md border border-slate-300 text-slate-600 text-xs font-medium">{semestral ? 'Semestral · 2 unidades' : 'Anual · 3 unidades'}</span>
                </div>
                <p className="text-slate-500 mt-0.5">Conselho de Classe Final{turmaCurso ? ` · ${turmaCurso}` : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setMostrarGuia(v => !v)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-100">
                <Info size={16} /> Como funciona
              </button>
              <button type="button" onClick={imprimir} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-100">
                <Printer size={16} /> Imprimir ata
              </button>
            </div>
          </header>

          {encerrada && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-300 text-slate-700">
              <Lock size={18} /> <span className="font-medium">Turma encerrada — somente consulta. Decisões não podem mais ser alteradas.</span>
            </div>
          )}

          {rascunhoSalvo && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white border border-slate-300 border-l-4 border-l-pink-500">
              <div className="flex items-center gap-3 text-slate-800">
                <RotateCcw size={18} className="text-pink-600 shrink-0" />
                <span>Há <b>{rascunhoSalvo.total}</b> alteração(ões) não gravada(s) feitas neste computador {rascunhoSalvo.quando && `às ${rascunhoSalvo.quando}`}.</span>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={descartarRascunho} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-100">Descartar</button>
                <button type="button" onClick={restaurarRascunho} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">Restaurar</button>
              </div>
            </div>
          )}

          {mostrarGuia && (
            <div className="p-5 rounded-xl bg-white border border-slate-200 grid md:grid-cols-3 gap-5 text-sm text-slate-600">
              <div><p className="font-semibold text-slate-900 mb-1">1. Notas completas</p>O Conselho só decide uma disciplina quando todas as unidades estão lançadas. As que faltam aparecem como <b>Aguardando nota</b>, com o professor responsável.</div>
              <div><p className="font-semibold text-slate-900 mb-1">2. Recuperação</p>Recuperação a partir de {NOTA_MINIMA.toFixed(1)} aprova automaticamente (<b>Aprovado na Recuperação</b>). Digite <b>NR</b> se o aluno não realizou.</div>
              <div><p className="font-semibold text-slate-900 mb-1">3. Decisão</p>Para quem não passou, escolha <b>Aprovado pelo Conselho</b>, <b>Dependência</b> ou <b>Conservado</b>. Use <b>Alterar</b> para corrigir. O rascunho fica guardado neste computador até gravar.</div>
            </div>
          )}

          {mensagem && (
            <div className={`flex items-start justify-between gap-3 p-4 rounded-xl bg-white border border-slate-300 border-l-4 ${mensagem.tipo === 'ok' ? 'border-l-emerald-500' : 'border-l-rose-500'}`}>
              <div className="flex items-center gap-3 text-slate-800">{mensagem.tipo === 'ok' ? <CheckCircle2 size={18} className="text-emerald-600 shrink-0" /> : <AlertTriangle size={18} className="text-rose-600 shrink-0" />}<span>{mensagem.texto}</span></div>
              <button type="button" onClick={() => setMensagem(null)} aria-label="Fechar" className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
          )}

          {/* Resumo / filtros */}
          <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Progresso do Conselho</p>
                <p className="text-2xl font-bold text-slate-900">{contagem.resolvido} de {decidiveis} <span className="text-base font-medium text-slate-500">disciplinas resolvidas</span></p>
              </div>
              <p className="text-3xl font-bold text-slate-900 tabular-nums">{progresso}%</p>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-slate-800 transition-all" style={{ width: `${progresso}%` }} /></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {([
                ['todos', 'Todos os alunos', alunos.length, 'alunos', null],
                ['decidir', 'Precisam de decisão', contagem.decidir, 'disciplinas', 'bg-pink-500'],
                ['aguardando', 'Aguardando notas', contagem.aguardando, 'disciplinas', 'bg-amber-400'],
                ['resolvido', 'Resolvidas', contagem.resolvido, 'disciplinas', 'bg-emerald-500'],
              ] as const).map(([valor, label, n, unidade, ponto]) => (
                <button key={valor} type="button" onClick={() => setFiltro(valor)} aria-pressed={filtro === valor}
                  className={`text-left p-3 rounded-lg border transition-all ${filtro === valor ? 'border-slate-900 ring-1 ring-slate-900 bg-white' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                  <div className="flex items-center gap-2 text-sm text-slate-600">{ponto && <span className={`w-2 h-2 rounded-full ${ponto}`} />}{label}</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5 tabular-nums">{n}</div>
                  <div className="text-xs text-slate-400">{unidade}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Notas não lançadas */}
          {pendenciasPorDisciplina.length > 0 && (
            <section className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-amber-400 p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 text-slate-900">
                  <AlertTriangle size={18} className="text-amber-500" />
                  <h2 className="font-semibold">Notas não lançadas <span className="font-normal text-slate-500">— {contagem.aguardando} disciplina(s) de aluno aguardando professor</span></h2>
                </div>
                {ehDirecao && !encerrada && (
                  <button type="button" onClick={abrirAviso} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-800 text-sm font-medium hover:bg-slate-100">
                    <Mail size={16} /> Avisar professores por e-mail
                  </button>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-x-6 divide-y md:divide-y-0 divide-slate-100">
                {pendenciasPorDisciplina.map(p => (
                  <div key={p.disciplina} className="flex items-center justify-between gap-3 py-2 text-sm border-b border-slate-100 last:border-0">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{p.disciplina}</p>
                      <p className="text-slate-500 truncate">{p.professores.length ? p.professores.join(', ') : 'sem professor vinculado'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-slate-900 tabular-nums">{p.alunos} aluno(s)</p>
                      <p className="text-xs text-slate-500">falta {unidadesTexto([...p.unidades].sort())} unid.</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Busca */}
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar aluno pelo nome…"
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 bg-white text-base outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
          </div>

          {/* Alunos */}
          <div className="space-y-4">
            {alunosVisiveis.length === 0 && (
              <div className="p-10 text-center text-slate-500 bg-white rounded-xl border border-slate-200">Nenhum aluno neste filtro.</div>
            )}
            {alunosVisiveis.map((a, idx) => {
              const cats = a.itens.map(categoria)
              const nDecidir = cats.filter(c => c === 'decidir').length
              const nAguardando = cats.filter(c => c === 'aguardando').length
              const tudoResolvido = nDecidir === 0 && nAguardando === 0
              const itensVisiveis = filtro === 'todos' ? a.itens : a.itens.filter(i => categoria(i) === filtro)
              return (
                <article key={a.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 bg-slate-50/70 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-right text-sm text-slate-400 tabular-nums">{String(idx + 1).padStart(2, '0')}</span>
                      <h3 className="text-base font-semibold text-slate-900">{a.nome}</h3>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                      {nDecidir > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-pink-500" />{nDecidir} para decidir</span>}
                      {nAguardando > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />{nAguardando} aguardando nota</span>}
                      {tudoResolvido && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Resolvido</span>}
                      {estadoAluno[a.id]?.fase === 'salvando' && <span className="flex items-center gap-1.5 text-slate-500"><Loader2 size={12} className="animate-spin" />Salvando…</span>}
                      {estadoAluno[a.id]?.fase === 'gravado' && !alteracoes.some(x => x.item.estudanteId === a.id) && <span className="flex items-center gap-1.5 text-emerald-700"><CheckCircle2 size={13} />Gravado às {estadoAluno[a.id].quando}</span>}
                      {estadoAluno[a.id]?.fase === 'erro' && (
                        <span className="flex items-center gap-1.5 text-rose-700" title={estadoAluno[a.id].erro}>
                          <AlertTriangle size={13} />Não gravado
                          <button type="button" onClick={() => tentarDeNovo(a.id)} className="underline underline-offset-2 font-medium">tentar de novo</button>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {itensVisiveis.map(i => {
                      const cat = categoria(i)
                      const rec = recAtual(i)
                      const final = statusFinal(i)
                      const alterado = alteracoes.some(x => x.item.key === i.key)
                      const bloqueado = encerrada || !i.notaId
                      const emEdicao = editando.has(i.key)
                      const decidido = ['APROVADO_CONSELHO', 'DEPENDENCIA', 'CONSERVADO'].includes(final)
                      return (
                        <div key={i.key} className={`grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_auto_4.5rem_5.5rem] xl:grid-cols-[minmax(0,1fr)_auto_4.5rem_5.5rem_23rem] gap-x-4 gap-y-2.5 items-center px-4 md:px-5 py-3 ${alterado ? 'bg-pink-50/40' : ''}`}>
                          {/* disciplina */}
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">{i.disciplinaNome}</p>
                            <p className="text-sm text-slate-500 truncate">
                              {i.professores.length ? i.professores.join(', ') : 'Sem professor vinculado'}
                              {ehDirecao && !encerrada && cat !== 'aguardando' && (
                                <button type="button" onClick={() => setEditarNotas(i)} className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 underline-offset-2 hover:underline hover:text-slate-900">
                                  <Pencil size={11} /> editar notas
                                </button>
                              )}
                            </p>
                          </div>
                          {/* unidades */}
                          <div className="flex gap-1.5" title="Notas por unidade">
                            {unidades.map(u => {
                              const v = notaDaUnidade(i, u)
                              const falta = i.unidadesFaltando.includes(u)
                              const inf = i.infrequente.includes(u)
                              return (
                                <div key={u} className={`w-12 h-11 rounded-lg border text-center flex flex-col justify-center ${falta ? 'border-dashed border-slate-300 text-slate-400' : 'border-slate-200 text-slate-800'}`}>
                                  <div className="text-[10px] text-slate-400 leading-none">U{u}</div>
                                  <div className="text-sm font-semibold tabular-nums leading-tight">{falta ? '—' : inf ? 'INF' : fmt(v)}</div>
                                </div>
                              )
                            })}
                          </div>
                          {/* média */}
                          <div className="text-center">
                            <div className="text-[10px] text-slate-400">Média</div>
                            <div className={`text-lg font-semibold tabular-nums ${cat === 'aguardando' || i.media === null ? 'text-slate-300' : i.media < NOTA_MINIMA ? 'text-rose-700' : 'text-slate-900'}`}>
                              {cat === 'aguardando' ? '—' : fmt(i.media)}
                            </div>
                          </div>
                          {/* recuperação */}
                          <div className="text-center">
                            <div className="text-[10px] text-slate-400">Recuperação</div>
                            <input
                              key={`${i.key}-${rec}`}
                              defaultValue={rec === null || rec === undefined ? '' : rec === -1 ? 'NR' : String(rec)}
                              onBlur={e => mudarRec(i, e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                              disabled={bloqueado || cat === 'aguardando'}
                              placeholder="—"
                              inputMode="decimal"
                              aria-label={`Recuperação de ${i.estudanteNome} em ${i.disciplinaNome}`}
                              className="w-16 h-9 text-center rounded-lg border border-slate-300 text-base font-semibold text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50 disabled:text-slate-300 disabled:border-slate-200"
                            />
                          </div>
                          {/* decisão */}
                          <div className="col-span-full xl:col-span-1 flex items-center">
                            {cat === 'aguardando' ? (
                              <SeloStatus tom="amber" texto={`Falta nota: ${unidadesTexto(i.unidadesFaltando)} unid.`}
                                acao={ehDirecao && !encerrada ? { texto: 'Lançar nota', onClick: () => setEditarNotas(i) } : undefined} />
                            ) : final === 'APROVADO_RECUPERACAO' ? (
                              <SeloStatus tom="emerald" texto="Aprovado na Recuperação" detalhe={`rec. ≥ ${NOTA_MINIMA}`} naoGravado={alterado} />
                            ) : decidido && !emEdicao ? (
                              <SeloStatus tom={STATUS_TOM[final]} texto={STATUS_LABEL[final]} naoGravado={alterado}
                                acao={bloqueado ? undefined : alterado
                                  ? { texto: 'Desfazer', onClick: () => desfazerDecisao(i) }
                                  : { texto: 'Alterar', onClick: () => setEditando(s => new Set(s).add(i.key)) }} />
                            ) : (
                              <div className="flex items-center gap-1.5 w-full" role="group" aria-label="Decisão do Conselho">
                                {DECISOES.map(d => (
                                  <button key={d.value} type="button" disabled={bloqueado} onClick={() => escolher(i, d.value)}
                                    aria-pressed={final === d.value}
                                    className={`flex-1 h-11 xl:h-10 px-1 whitespace-nowrap rounded-lg border text-sm xl:text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${final === d.value ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-300 text-slate-700 hover:border-slate-500 hover:bg-slate-50'}`}>
                                    {d.curto}
                                  </button>
                                ))}
                                {emEdicao && (
                                  <button type="button" onClick={() => setEditando(s => { const n = new Set(s); n.delete(i.key); return n })}
                                    className="h-11 xl:h-10 px-2 rounded-lg text-slate-400 hover:text-slate-700" aria-label="Cancelar alteração"><X size={16} /></button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </article>
              )
            })}
          </div>
        </div>

        {/* Rodapé fixo */}
        {!encerrada && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200">
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-sm text-slate-600">
                {!online
                  ? <span className="flex items-center gap-2 text-rose-700"><WifiOff size={16} /> Sem internet — suas alterações estão guardadas neste computador.</span>
                  : alteracoes.length === 0
                    ? <span className="text-slate-500">Tudo gravado · cada aluno é gravado automaticamente ao ser concluído</span>
                    : <span><b className="text-slate-900">{alteracoes.length}</b> alteração(ões) aguardando gravação <span className="text-slate-400">· grava sozinho ao concluir o aluno · rascunho neste computador{ultimoRascunho ? ` às ${ultimoRascunho}` : ''}</span></span>}
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button type="button" onClick={descartar} disabled={!alteracoes.length || salvando}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-100 disabled:opacity-40">
                  <Undo2 size={18} /> Descartar
                </button>
                <button type="button" onClick={() => setRevisar(true)} disabled={!alteracoes.length || salvando || !online}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-pink-600 text-white font-semibold hover:bg-pink-700 disabled:opacity-40">
                  {salvando ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Gravar agora
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: lançar/editar notas (Direção, durante o Conselho) */}
        {editarNotas && (
          <EditorNotas
            item={editarNotas}
            semestral={semestral}
            onClose={() => setEditarNotas(null)}
            onSalvo={texto => { setEditarNotas(null); setMensagem({ tipo: 'ok', texto }); router.refresh() }}
          />
        )}

        {/* Modal: revisar */}
        {revisar && (
          <Modal titulo="Revisar decisões" subtitulo="Confira antes de gravar. Ou grava tudo, ou nada." onClose={() => setRevisar(false)}>
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr><th className="py-2 font-medium">Aluno / disciplina</th><th className="py-2 text-center font-medium">Rec.</th><th className="py-2 font-medium">Antes</th><th className="py-2 font-medium">Depois</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alteracoes.map(a => (
                  <tr key={a.item.key}>
                    <td className="py-2"><p className="font-medium text-slate-900">{a.item.estudanteNome}</p><p className="text-slate-500">{a.item.disciplinaNome}</p></td>
                    <td className="py-2 text-center tabular-nums">{fmt(a.novaNotaRec)}</td>
                    <td className="py-2 text-slate-500">{STATUS_LABEL[a.item.status] || a.item.status}</td>
                    <td className="py-2 font-medium text-slate-900">{STATUS_LABEL[a.novoStatus] || a.novoStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={() => setRevisar(false)} className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-100">Voltar</button>
              <button type="button" onClick={gravar} className="px-6 py-2.5 rounded-xl bg-pink-600 text-white font-semibold hover:bg-pink-700 flex items-center gap-2"><Save size={16} /> Gravar {alteracoes.length} decisão(ões)</button>
            </div>
          </Modal>
        )}

        {/* Modal: conservado */}
        {conservar && (
          <Modal titulo="Conservar o aluno?" subtitulo={conservar.estudanteNome} onClose={() => setConservar(null)}>
            <p className="text-slate-700">Conservado normalmente vale para o período inteiro. Aplicar em quais disciplinas?</p>
            <p className="text-sm text-slate-500 mt-2">Disciplinas já aprovadas na recuperação e as que aguardam nota não são alteradas.</p>
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-5">
              <button type="button" onClick={() => setConservar(null)} className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-100">Cancelar</button>
              <button type="button" onClick={() => aplicarConservado(conservar, false)} className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-800 font-medium hover:bg-slate-100">Só em {conservar.disciplinaNome}</button>
              <button type="button" onClick={() => aplicarConservado(conservar, true)} className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800">Em todas as disciplinas</button>
            </div>
          </Modal>
        )}

        {/* Modal: avisar professores */}
        {aviso && (
          <Modal titulo="Avisar professores por e-mail" subtitulo={`Notas que faltam lançar na turma ${turmaNome}`} onClose={() => aviso.etapa !== 'enviando' && setAviso(null)}>
            {(aviso.etapa === 'carregando' || aviso.etapa === 'enviando') && (
              <div className="flex items-center gap-3 py-8 justify-center text-slate-600"><Loader2 className="animate-spin" /> {aviso.etapa === 'carregando' ? 'Verificando pendências…' : 'Enviando e-mails…'}</div>
            )}
            {aviso.etapa === 'erro' && <p className="text-rose-700 py-4">{aviso.erro}</p>}
            {aviso.etapa === 'previa' && (
              <>
                {!aviso.dados?.destinatarios?.length
                  ? <p className="py-4 text-slate-600">Nenhum professor a avisar.</p>
                  : <>
                      <p className="text-slate-700 mb-3">Cada professor recebe <b>um e-mail</b> com os alunos e as unidades que faltam, e o link para lançar:</p>
                      <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                        {aviso.dados.destinatarios.map(d => (
                          <li key={d.email} className="px-4 py-2.5 text-sm">
                            <div className="flex justify-between gap-2"><span className="font-medium text-slate-900">{d.nome}</span>{!d.ativo && <span className="text-xs text-rose-700">usuário inativo — não será enviado</span>}</div>
                            <p className="text-slate-500">{d.email}</p>
                            <p className="text-slate-600">{d.disciplinas.map(x => `${x.disciplina} (${x.alunosPendentes} aluno${x.alunosPendentes > 1 ? 's' : ''})`).join(' · ')}</p>
                          </li>
                        ))}
                      </ul>
                    </>}
                {(aviso.dados?.semProfessor.length ?? 0) > 0 && (
                  <p className="text-sm text-rose-700 mt-3">Sem professor vinculado (ninguém para avisar): {aviso.dados?.semProfessor.join(', ')}</p>
                )}
                <div className="flex justify-end gap-2 pt-5">
                  <button type="button" onClick={() => setAviso(null)} className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-100">Cancelar</button>
                  {aviso.dados?.destinatarios?.some(d => d.ativo) && (
                    <button type="button" onClick={enviarAviso} className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 flex items-center gap-2">
                      <Send size={16} /> Enviar {aviso.dados?.destinatarios?.filter(d => d.ativo).length} e-mail(s)
                    </button>
                  )}
                </div>
              </>
            )}
            {aviso.etapa === 'feito' && (
              <>
                <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl text-sm">
                  {aviso.dados?.resultados?.map(r => (
                    <li key={r.email} className="px-4 py-2.5 flex justify-between gap-2">
                      <span>{r.nome}</span>
                      <span className={r.resultado === 'smtp' || r.resultado === 'resend' ? 'text-emerald-700' : r.resultado === 'simulado' ? 'text-amber-700' : 'text-rose-700'}>
                        {{ smtp: 'enviado', resend: 'enviado', simulado: 'não enviado (e-mail não configurado)', erro: 'falhou', inativo: 'inativo — não enviado' }[r.resultado]}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-end pt-5"><button type="button" onClick={() => setAviso(null)} className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-semibold">Fechar</button></div>
              </>
            )}
          </Modal>
        )}
      </div>
    </>
  )
}

/** Selo de status pintado com a cor do status, com a mesma altura dos botões (mantém tudo alinhado). */
const TONS: Record<Tom, { caixa: string; acao: string }> = {
  amber: { caixa: 'bg-amber-50 border-amber-200 text-amber-900', acao: 'border-amber-300 text-amber-900 hover:bg-amber-100' },
  emerald: { caixa: 'bg-emerald-50 border-emerald-200 text-emerald-900', acao: 'border-emerald-300 text-emerald-900 hover:bg-emerald-100' },
  slate: { caixa: 'bg-slate-100 border-slate-300 text-slate-800', acao: 'border-slate-300 text-slate-800 hover:bg-slate-200' },
  rose: { caixa: 'bg-rose-50 border-rose-200 text-rose-900', acao: 'border-rose-300 text-rose-900 hover:bg-rose-100' },
}

function SeloStatus({ tom, texto, detalhe, naoGravado, acao }: {
  tom: Tom; texto: string; detalhe?: string; naoGravado?: boolean; acao?: { texto: string; onClick: () => void }
}) {
  const t = TONS[tom]
  return (
    <div className={`w-full h-11 xl:h-10 flex items-center justify-between gap-2 rounded-lg border pl-3 pr-1.5 ${t.caixa}`}>
      <div className="flex items-center gap-2 min-w-0 text-sm">
        <span className="font-medium truncate">{texto}</span>
        {detalhe && <span className="opacity-60 shrink-0">({detalhe})</span>}
        {naoGravado && <span className="shrink-0 text-[11px] px-1.5 py-0.5 rounded bg-white/80 text-slate-600">não gravado</span>}
      </div>
      {acao && (
        <button type="button" onClick={acao.onClick} className={`shrink-0 h-8 px-2.5 rounded-md border bg-white/70 text-sm font-medium ${t.acao}`}>
          {acao.texto}
        </button>
      )}
    </div>
  )
}

function Modal({ titulo, subtitulo, onClose, children }: { titulo: string; subtitulo?: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div><h3 className="text-lg font-semibold text-slate-900">{titulo}</h3>{subtitulo && <p className="text-sm text-slate-500">{subtitulo}</p>}</div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" aria-label="Fechar"><X size={20} /></button>
        </div>
        <div className="px-6 py-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

/** Janela para a Direção lançar/corrigir as notas das unidades e a recuperação durante o Conselho. */
function EditorNotas({ item, semestral, onClose, onSalvo }: {
  item: ItemConselho; semestral: boolean; onClose: () => void; onSalvo: (mensagem: string) => void
}) {
  const unidades = unidadesDaTurma(semestral)
  const [valores, setValores] = useState<Record<Unidade, string>>(() => ({
    1: item.nota1 === null ? '' : String(item.nota1),
    2: item.nota2 === null ? '' : String(item.nota2),
    3: item.nota3 === null ? '' : String(item.nota3),
  }))
  const [inf, setInf] = useState<Record<Unidade, boolean>>(() => ({
    1: item.infrequente.includes(1), 2: item.infrequente.includes(2), 3: item.infrequente.includes(3),
  }))
  const [rec, setRec] = useState(item.notaRecuperacao === null ? '' : item.notaRecuperacao === -1 ? 'NR' : String(item.notaRecuperacao))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const num = (t: string) => { const v = t.trim().replace(',', '.'); return v === '' ? null : Number(v) }
  const invalida = (t: string) => { const v = num(t); return v !== null && (isNaN(v) || v < 0 || v > 10) }
  const completa = unidades.every(u => inf[u] || num(valores[u]) !== null)
  const media = completa
    ? Math.round((unidades.reduce((soma, u) => soma + (inf[u] ? 0 : num(valores[u]) ?? 0), 0) / unidades.length) * 10) / 10
    : null
  const precisaRec = media !== null && media < NOTA_MINIMA
  const recValor = rec.trim().toUpperCase() === 'NR' ? -1 : num(rec)
  const recInvalida = rec.trim() !== '' && rec.trim().toUpperCase() !== 'NR' && invalida(rec)
  const temErro = unidades.some(u => !inf[u] && invalida(valores[u])) || recInvalida

  const salvar = async () => {
    setSalvando(true); setErro(null)
    try {
      const nota = (u: Unidade) => (inf[u] ? '' : valores[u].trim().replace(',', '.'))
      const r = await fetch('/api/notas/lancar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contexto: 'CONSELHO',
          notas: [{
            estudanteId: item.estudanteId, disciplinaId: item.disciplinaId,
            nota1: nota(1), nota2: nota(2), nota3: semestral ? '' : nota(3),
            isDesistenteUnid1: inf[1], isDesistenteUnid2: inf[2], isDesistenteUnid3: semestral ? false : inf[3],
          }]
        })
      })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) { setErro(body.message || body.error || 'Não foi possível salvar as notas.'); return }
      const notaId: string | undefined = item.notaId ?? body.results?.[0]?.id

      if (precisaRec && rec.trim() !== '' && notaId && recValor !== item.notaRecuperacao) {
        const r2 = await fetch('/api/notas/recuperacao', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notas: [{ notaId, notaRecuperacao: recValor }] })
        })
        const b2 = await r2.json().catch(() => ({}))
        if (!r2.ok) { setErro(`Notas das unidades salvas, mas a recuperação não: ${b2.message || 'erro'}`); return }
      }
      onSalvo(`Notas de ${item.estudanteNome} em ${item.disciplinaNome} salvas.`)
    } catch {
      setErro('Sem conexão com o servidor.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal titulo={item.notaId ? 'Editar notas' : 'Lançar notas'} subtitulo={`${item.estudanteNome} · ${item.disciplinaNome}`} onClose={onClose}>
      <p className="text-sm text-slate-600 mb-4">
        Lançamento feito pela Direção durante o Conselho — fica registrado na auditoria em seu nome.
        {item.professores.length > 0 && <> Professor(a) da disciplina: <b>{item.professores.join(', ')}</b>.</>}
      </p>
      <div className={`grid gap-3 ${semestral ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {unidades.map(u => (
          <div key={u} className={`rounded-xl border p-3 ${item.unidadesFaltando.includes(u) && !inf[u] && num(valores[u]) === null ? 'border-dashed border-slate-400' : 'border-slate-200'}`}>
            <label className="text-sm font-medium text-slate-700" htmlFor={`u${u}`}>{u}ª unidade</label>
            <input id={`u${u}`} value={inf[u] ? '' : valores[u]} disabled={inf[u]} inputMode="decimal" placeholder={inf[u] ? 'INF' : '0 a 10'}
              onChange={e => setValores(v => ({ ...v, [u]: e.target.value }))}
              className={`mt-1 w-full h-11 text-center text-lg font-semibold rounded-lg border outline-none disabled:bg-slate-100 ${invalida(valores[u]) && !inf[u] ? 'border-rose-400 bg-rose-50' : 'border-slate-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200'}`} />
            <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={inf[u]} onChange={e => setInf(v => ({ ...v, [u]: e.target.checked }))} /> Infrequente (INF)
            </label>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-4 p-3 rounded-xl bg-slate-50">
        <div>
          <p className="text-xs text-slate-500">Média das unidades</p>
          <p className={`text-2xl font-bold tabular-nums ${media === null ? 'text-slate-300' : media < NOTA_MINIMA ? 'text-rose-700' : 'text-slate-900'}`}>{media === null ? '—' : media.toFixed(1)}</p>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs text-slate-500" htmlFor="rec">Recuperação {precisaRec ? '(≥ 5 aprova; NR = não realizou)' : ''}</label>
          <input id="rec" value={rec} onChange={e => setRec(e.target.value)} disabled={!precisaRec} inputMode="decimal"
            placeholder={media === null ? 'Lance todas as unidades primeiro' : precisaRec ? '0 a 10 ou NR' : 'Não precisa — média ≥ 5'}
            className={`mt-1 w-full h-11 px-3 text-lg font-semibold rounded-lg border outline-none disabled:bg-slate-100 disabled:text-slate-400 ${recInvalida ? 'border-rose-400 bg-rose-50' : 'border-slate-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200'}`} />
        </div>
      </div>
      <p className="text-sm mt-2 text-slate-600">
        {media === null ? 'Com unidade em branco, a disciplina continua aguardando nota.'
          : !precisaRec ? 'Com média ≥ 5 o aluno fica Aprovado e sai do Conselho.'
          : aprovadoNaRecuperacao(recValor) ? 'Com recuperação ≥ 5 o aluno fica Aprovado na Recuperação.'
          : 'Sem aprovação: depois de salvar, o Conselho decide na linha do aluno.'}
      </p>

      {erro && <p className="mt-3 p-3 rounded-lg bg-rose-50 text-rose-800 text-sm">{erro}</p>}
      <div className="flex justify-end gap-2 pt-5">
        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-100">Cancelar</button>
        <button type="button" onClick={salvar} disabled={salvando || temErro}
          className="px-6 py-2.5 rounded-xl bg-pink-600 text-white font-semibold hover:bg-pink-700 disabled:opacity-40 flex items-center gap-2">
          {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar notas
        </button>
      </div>
    </Modal>
  )
}

