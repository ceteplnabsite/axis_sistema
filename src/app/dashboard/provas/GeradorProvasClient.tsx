"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { 
  Scissors, 
  FileText, 
  RefreshCw, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  Settings2,
  Trash2,
  ChevronRight,
  Printer,
  Plus,
  Search,
  X,
  History as HistoryIcon,
  Calendar,
  User as UserIcon,
  Copy,
  Save,
  FileDown, // Added
  ClipboardCheck // Added
} from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { stripHtml } from "@/lib/text-utils"

const loadPdfImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.src = url
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(e)
  })
}

const shuffleSystemForExams = (questionsArray: any[], seedStr: string) => {
  const getSeed = (str: string) => {
      let hash = 0
      for (let i = 0; i < str.length; i++) {
          hash = ((hash << 5) - hash) + str.charCodeAt(i)
          hash |= 0
      }
      return Math.abs(hash)
  }

  const mulberry32 = (a: number) => {
      return function() {
        let t = a += 0x6D2B79F5
        t = Math.imul(t ^ t >>> 15, t | 1)
        t ^= t + Math.imul(t ^ t >>> 7, t | 61)
        return ((t ^ t >>> 14) >>> 0) / 4294967296
      }
  }

  const seedValue = getSeed(seedStr)
  const randomFunc = mulberry32(seedValue)

  const shuffleArray = (array: any[]) => {
      for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(randomFunc() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
      }
  }

  // Clonamos profundamente
  let finalQuestions = JSON.parse(JSON.stringify(questionsArray))

  // A. Agrupar por disciplina
  const questionsByDisc: Record<string, any[]> = {}
  const discOrder: string[] = []

  finalQuestions.forEach((q: any) => {
      const discName = q.disciplinas?.[0]?.nome || q.disciplina?.nome || 'Geral'
      if (!questionsByDisc[discName]) {
          questionsByDisc[discName] = []
          discOrder.push(discName)
      }
      questionsByDisc[discName].push(q)
  })

  let shuffledList: any[] = []
  discOrder.forEach(discName => {
      const qs = questionsByDisc[discName]
      shuffleArray(qs)
      shuffledList = [...shuffledList, ...qs]
  })
  
  finalQuestions = shuffledList

  // B. Embaralhar alternativas
  let lastCorrect1 = ''
  let lastCorrect2 = ''

  return finalQuestions.map((q: any) => {
      const alts = [
          { text: q.alternativaA },
          { text: q.alternativaB },
          { text: q.alternativaC },
          { text: q.alternativaD },
          { text: q.alternativaE }
      ]
      
      const originalCorrectLetter = q.correta || 'A'
      const correctContent = q[`alternativa${originalCorrectLetter}`]
      
      let shuffledAlts = [...alts]
      let newCorrectLetter = ''
      const letters = ['A', 'B', 'C', 'D', 'E']

      for (let attempt = 0; attempt < 10; attempt++) {
          shuffleArray(shuffledAlts)
          const newCorrectIdx = shuffledAlts.findIndex(a => a.text === correctContent)
          if (newCorrectIdx !== -1) {
            newCorrectLetter = letters[newCorrectIdx]
            if (newCorrectLetter !== lastCorrect1 || newCorrectLetter !== lastCorrect2) {
                break;
            }
          }
      }
      
      if (!newCorrectLetter) newCorrectLetter = 'A' // fallback 
      
      const newQ = { ...q }
      shuffledAlts.forEach((alt, idx) => {
          const letter = letters[idx]
          newQ[`alternativa${letter}`] = alt.text
      })
      newQ.correta = newCorrectLetter
      
      lastCorrect2 = lastCorrect1
      lastCorrect1 = newCorrectLetter
      
      return newQ
  })
}

// O Modal de Pré-visualização foi movido para dentro do GeradorProvasClient para ter acesso às funções de geração de PDF.

const ManualSelectorModal = ({ isOpen, onClose, onSelect, questions, selectedIds, disciplinaNome, onFetchSerie }: any) => {
  const [search, setSearch] = useState("")
  const [loadingSerie, setLoadingSerie] = useState(false)
  
  if (!isOpen) return null

  const filtered = questions.filter((q: any) => 
    stripHtml(q.enunciado).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Selecionar Questões</h2>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-500">{disciplinaNome}</p>
              <span className="text-gray-300">•</span>
              <button 
                onClick={async () => {
                  setLoadingSerie(true)
                  await onFetchSerie()
                  setLoadingSerie(false)
                }}
                disabled={loadingSerie}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 uppercase tracking-tight disabled:opacity-50"
              >
                {loadingSerie ? "Buscando..." : "Buscar em outras turmas do mesmo ano"}
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        <div className="p-4 bg-gray-50 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text"
              placeholder="Pesquisar por conteúdo da questão..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filtered.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <Search size={48} className="mx-auto mb-4 opacity-20" />
              <p>Nenhuma questão encontrada para os critérios.</p>
            </div>
          ) : (
            filtered.map((q: any) => (
              <div 
                key={q.id} 
                className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                  selectedIds.includes(q.id) 
                  ? 'border-blue-500 bg-blue-50/50' 
                  : 'border-gray-100 hover:border-blue-200 hover:shadow-md'
                }`}
                onClick={() => onSelect(q)}
              >
                <div className="flex justify-between gap-4 mb-2">
                  <div className="text-sm text-gray-800 font-medium line-clamp-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: q.enunciado }} />
                  <div className={`mt-1 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedIds.includes(q.id) 
                    ? 'bg-blue-600 border-blue-600' 
                    : 'border-gray-200 bg-white'
                  }`}>
                    {selectedIds.includes(q.id) && <CheckCircle2 size={14} className="text-white" />}
                  </div>
                </div>
                <div className="flex items-center flex-wrap gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-gray-100 text-gray-400 uppercase tracking-widest">{q.dificuldade}</span>
                  {q.turmas && q.turmas.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 border border-blue-100 text-blue-500 uppercase tracking-widest">
                      {q.turmas[0].nome}
                    </span>
                  )}
                  {selectedIds.includes(q.id) && <span className="text-[10px] font-bold text-blue-600 ml-auto">Selecionada</span>}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500">
            <span className="text-blue-600 font-bold">{selectedIds.length}</span> questões selecionadas
          </p>
          <button 
            onClick={onClose}
            className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold shadow-lg active:scale-95 transition-all"
          >
            Concluir Seleção
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GeradorProvasClient({ user, turmas }: any) {
  const [selectedTurma, setSelectedTurma] = useState<any>(null)
  const [config, setConfig] = useState<any[]>([]) // { disciplinaId, qtd }
  const [loading, setLoading] = useState(false)
  const [draftQuestions, setDraftQuestions] = useState<any[]>([])
  const [availableQuestions, setAvailableQuestions] = useState<any[]>([])
  const [titulo, setTitulo] = useState("SIMULADO")
  const [unidade, setUnidade] = useState("") // Nova Unidade
  const [valorQuestao, setValorQuestao] = useState("") // Novo Valor da Questão
  
  const [manualSelector, setManualSelector] = useState<{ isOpen: boolean, discId: string, discNome: string }>({ 
    isOpen: false, discId: "", discNome: "" 
  })
  const [provasRecentes, setProvasRecentes] = useState<any[]>([])
  const [searchHistory, setSearchHistory] = useState("")
  const [viewingProva, setViewingProva] = useState<any>(null)
  const [layoutColunas, setLayoutColunas] = useState<1 | 2>(1)
  const [isAmpliada, setIsAmpliada] = useState(false)
  const [activeTab, setActiveTab] = useState<'gerador' | 'historico'>('gerador')
  const [lastSavedProva, setLastSavedProva] = useState<any>(null)

  
  // Estados para Filtro de Turmas
  const [filterCurso, setFilterCurso] = useState("")
  const [filterTurno, setFilterTurno] = useState("")
  const [filterNomeTurma, setFilterNomeTurma] = useState("")

  const uniqueCursos = useMemo(() => Array.from(new Set(turmas.map((t: any) => t.curso).filter(Boolean))), [turmas]) as string[]
  const uniqueTurnos = useMemo(() => Array.from(new Set(turmas.map((t: any) => t.turno).filter(Boolean))), [turmas]) as string[]

  const filteredTurmas = useMemo(() => {
    return turmas.filter((t: any) => {
      const matchCurso = filterCurso ? t.curso === filterCurso : true
      const matchTurno = filterTurno ? t.turno === filterTurno : true
      const matchNome = filterNomeTurma ? t.nome.toLowerCase().includes(filterNomeTurma.toLowerCase()) : true
      return matchCurso && matchTurno && matchNome
    })
  }, [turmas, filterCurso, filterTurno, filterNomeTurma])
  










  const fetchProvas = async (searchTerm = "") => {
    try {
      const url = searchTerm ? `/api/provas?search=${searchTerm}` : '/api/provas'
      const res = await fetch(url)
      
      if (!res.ok) {
        const errorText = await res.text()
        console.error(`Status ${res.status} ao buscar provas:`, errorText)
        setProvasRecentes([])
        return
      }

      const data = await res.json()
      if (Array.isArray(data)) {
        setProvasRecentes(data)
      } else {
        console.error("API de provas retornou formato inesperado (não é array):", data)
        setProvasRecentes([])
      }
    } catch (error) {
      console.error("Falha na requisição de provas:", error)
      setProvasRecentes([])
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProvas(searchHistory)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchHistory])

  useEffect(() => {
    if (selectedTurma) {
      const discMap = selectedTurma.disciplinas?.map((d: any) => ({ disciplinaId: d.id, nome: d.nome, qtd: 0 })) || []
      setConfig(discMap)
      
      // Carrega o nome da turma no título por padrão
      // Se o título for o original, estiver vazio ou já contiver um hífen (indicando uma troca de turma), atualizamos
      if (titulo === "AVALIAÇÃO BIMESTRAL" || titulo === "SIMULADO" || !titulo || (titulo.includes(" - ") && !titulo.includes("SIMULADO "))) {
        setTitulo(`SIMULADO - ${selectedTurma.nome.toUpperCase()}`)
      }
    }
  }, [selectedTurma])
  
  // PRÉ-CARREGAMENTO DE QUESTÕES PARA CONTADORES E SELEÇÃO
  useEffect(() => {
    if (selectedTurma) {
      const fetchAvailable = async () => {
        setLoading(true)
        try {
          const query = new URLSearchParams({
            status: 'APROVADA',
            serie: selectedTurma.serie || '', // Puxa a série para garantir que pegamos tudo do mesmo nível
            limit: '500'
          })
          if (unidade) query.append('unidade', unidade)

          const res = await fetch(`/api/questoes?${query.toString()}`)
          const data = await res.json()
          if (Array.isArray(data)) {
            // Filtro de segurança: Mantemos apenas questões que pertencem a uma turma COM O MESMO NOME da selecionada
            // Isso resolve o problema de ter duas turmas "3TIM1" com IDs diferentes no banco.
            const filteredByTurmaName = data.filter((q: any) => 
              q.turmas?.some((t: any) => t.nome === selectedTurma.nome)
            )
            setAvailableQuestions(filteredByTurmaName)
          }
        } catch (error) {
          console.error("Erro ao pré-carregar questões:", error)
        } finally {
          setLoading(false)
        }
      }
      fetchAvailable()
    }
  }, [selectedTurma, unidade])

  // Reset do lastSavedProva quando o conteúdo da prova muda
  useEffect(() => {
    setLastSavedProva(null)
  }, [draftQuestions, titulo, selectedTurma?.id])

  const handleGenerateDraft = async () => {
    if (!selectedTurma || !availableQuestions.length) return
    setLoading(true)
    
    try {
      const selected: any[] = []
      
      // Para cada disciplina configurada, filtra por NOME no que já temos carregado
      config.forEach(c => {
        if (c.qtd > 0) {
        const discQuestions = availableQuestions.filter((q: any) => 
          q.disciplinas.some((d: any) => {
            const qNome = d.nome?.trim().toLowerCase() || "";
            const fNome = c.nome?.trim().toLowerCase() || "";
            return qNome === fNome;
          })
        )
          
          // Embaralha e seleciona a quantidade pedida
          const shuffled = [...discQuestions].sort(() => 0.5 - Math.random())
          selected.push(...shuffled.slice(0, c.qtd))
        }
      })

      // EMBARALHAMENTO DAS QUESTÕES E ALTERNATIVAS (Criação do Snapshot)
      const finalSelected: any[] = []
      const discGroups: Record<string, any[]> = {}
      selected.forEach(q => {
        const dName = q.disciplinas[0]?.nome || 'Geral'
        if (!discGroups[dName]) discGroups[dName] = []
        discGroups[dName].push(q)
      })

      Object.values(discGroups).forEach((group: any) => {
        // Embaralha ordem das questões dentro da disciplina
        group.sort(() => 0.5 - Math.random())
        
        // Embaralha alternativas de cada questão
        const shuffledGroup = group.map((q: any) => {
          const letters = ['A', 'B', 'C', 'D', 'E']
          const alts = letters.map(l => ({ text: q[`alternativa${l}`], originalId: l }))
          const shuffledAlts = [...alts].sort(() => 0.5 - Math.random())
          
          const newQ = { ...JSON.parse(JSON.stringify(q)) } // Deep clone
          shuffledAlts.forEach((alt, idx) => {
            newQ[`alternativa${letters[idx]}`] = alt.text
          })
          
          const correctContent = q[`alternativa${q.correta}`]
          const newCorrectIdx = shuffledAlts.findIndex(a => a.text === correctContent)
          newQ.correta = letters[newCorrectIdx]
          
          return newQ
        })
        finalSelected.push(...shuffledGroup)
      })

      setDraftQuestions(finalSelected)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const editExistingProva = async (p: any) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/provas/${p.id}`)
      if (!res.ok) throw new Error("Não foi possível carregar os detalhes.")
      const fullProva = await res.json()
      
      setSelectedTurma(fullProva.turma)
      setTitulo(`${fullProva.titulo} (Cópia)`)
      
      // Se houver snapshot, usa a versão salva. Caso contrário usa as questões do banco.
      setDraftQuestions(fullProva.questoesSnapshot || fullProva.questoes)
      
      // Busca questões disponíveis para swap
      const qRes = await fetch(`/api/questoes?turmaId=${fullProva.turma.id}&status=APROVADA`)
      const allApprovadas = await qRes.json()
      setAvailableQuestions(allApprovadas)

      // Atualiza config com quantidades
      const counts: any = {}
      fullProva.questoes.forEach((q: any) => {
        q.disciplinas.forEach((d: any) => {
          counts[d.nome] = (counts[d.nome] || 0) + 1
        })
      })

      const newConfig = fullProva.turma.disciplinas?.map((d: any) => ({
        disciplinaId: d.id,
        nome: d.nome,
        qtd: counts[d.nome] || 0
      })) || []
      setConfig(newConfig)
      
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      console.error(error)
      alert("Erro ao carregar prova para edição.")
    } finally {
      setLoading(false)
    }
  }

  const swapQuestion = (index: number) => {
    const qAtal = draftQuestions[index]
    const discId = qAtal.disciplinas[0]?.id // Simplificação: pega a primeira disc
    
    // Candidatas do banco que nâo estão no draft
    const candidates = availableQuestions.filter(q => 
      q.disciplinas.some((d: any) => d.id === discId) && 
      !draftQuestions.some(dq => dq.id === q.id)
    )

    if (candidates.length > 0) {
      const newDraft = [...draftQuestions]
      newDraft[index] = candidates[Math.floor(Math.random() * candidates.length)]
      setDraftQuestions(newDraft)
    } else {
      alert("Não há mais questões aprovadas desta disciplina no banco.")
    }


  }

  const saveProva = async () => {

    if (!selectedTurma || !draftQuestions.length) return null
    setLoading(true)
    try {
      // Embaralha determinísticamente para criar um unique snapshot fixo!
      const seedName = `prova_${Date.now()}`
      const shuffledSnapshot = shuffleSystemForExams(draftQuestions, seedName)

      const response = await fetch('/api/provas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: titulo,
          turmaId: selectedTurma.id,
          questoesIds: draftQuestions.map((q: any) => q.id),
          questoesSnapshot: shuffledSnapshot // Envia a versão EMBARALHADA permanentemente
        })
      })
      
      if (!response.ok) {
        let errorMsg = "Erro ao salvar no banco"
        try {
          const contentType = response.headers.get("content-type")
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json()
            console.error("Erro detalhado ao salvar prova (JSON):", errorData)
            errorMsg = errorData.message || errorMsg
          } else {
            const text = await response.text()
            console.error("Erro detalhado ao salvar prova (Texto):", text)
          }
        } catch (e) {
          console.error("Erro ao ler resposta de erro:", e)
        }
        throw new Error(errorMsg)
      }
      
      const newProva = await response.json()
      setLastSavedProva(newProva) // Armazena o registro salvo para evitar duplicidade
      fetchProvas()
      return newProva
    } catch (error: any) {
      console.error("Erro ao salvar registro da prova:", error)
      alert(error.message || "Houve um erro ao salvar o registro no histórico.")
      return null
    } finally {
      setLoading(false)
    }
  }

  const deleteProva = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta prova do histórico? Esta ação é irreversível.")) return

    setLoading(true)
    try {
      const res = await fetch(`/api/provas/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Erro ao excluir prova")
      }
      
      alert("Prova excluída com sucesso!")
      fetchProvas()
      if (viewingProva?.id === id) setViewingProva(null)
    } catch (error: any) {
      console.error(error)
      alert(error.message || "Erro ao excluir prova.")
    } finally {
      setLoading(false)
    }
  }


  const generatePDF = async (prova: any, options: { layout?: 1 | 2; ampliada?: boolean; preenchido?: boolean; apenasGabarito?: boolean } = {}) => {
    // Se o argumento for um evento (clique do botão), ignoramos
    const isHistory = prova && prova.id && !prova.nativeEvent
    
    // Se já foi salva previamente (neste rascunho), usamos o registro salvo
    const effectiveRecord = isHistory ? prova : lastSavedProva
    const hasBeenSaved = !!effectiveRecord

    // --- PREPARAÇÃO DOS DADOS ---
    let currentTitulo = hasBeenSaved ? effectiveRecord.titulo : titulo
    let currentTurma = hasBeenSaved ? effectiveRecord.turma : selectedTurma

    let questionsToUse: any[] = []

    // Se não for visualização de histórico nem tiver sido salva ainda, salva no banco antes de gerar
    if (!hasBeenSaved) {
      const saved = await saveProva()
      if (!saved) return // Se falhou ao salvar, nâo gera PDF
      questionsToUse = saved.questoesSnapshot // IMPORTANT: Pulls the permanently shuffled ones generated inside saveProva!
    } else {
      questionsToUse = effectiveRecord.questoesSnapshot || effectiveRecord.questoes
    }
    
    if (!questionsToUse || !questionsToUse.length) return

    const finalAmpliada = options?.ampliada !== undefined ? options.ampliada : isAmpliada

    const finalLayout = options?.layout !== undefined ? options.layout : layoutColunas

    const doc = new jsPDF({
      orientation: finalAmpliada ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const colSpacing = 10
    
    // Configurações de Acessibilidade (Ampliada)
    const fontSizeBase = finalAmpliada ? 18 : 10
    const fontSizeTitle = finalAmpliada ? 22 : 14
    const fontSizeHeader = finalAmpliada ? 14 : 10
    const currentLayoutColunas = finalAmpliada ? 1 : finalLayout
    const currentColWidth = currentLayoutColunas === 2 ? (pageWidth - 30) / 2 : pageWidth - 30
    
    // Tentativa de carregar Logo via Base64/Public URL
    try {
      const logoImg = await loadPdfImage('/logo-cetep-pdf.png')
      // Centraliza na esquerda (margem 10, y=7), mantendo o texto livre de sobreposição
      doc.addImage(logoImg, 'PNG', 12, 5, 20, 20)
    } catch (error) {
      console.warn("Logo não encontrado ou não autorizado. Gerando PDF sem logo.")
    }

    // Cabeçalho
    doc.setFontSize(isAmpliada ? 18 : 16)
    // O texto é levemente empurrado à direita para a logo caso não esteja posicionado
    doc.text("CENTRO TERRITORIAL DE EDUCAÇÃO PROFISSIONAL", pageWidth / 2, 15, { align: "center" })
    doc.setFontSize(isAmpliada ? 14 : 12)
    doc.text("LITORAL NORTE E AGRESTE BAIANO - CETEP/LNAB", pageWidth / 2, 22, { align: "center" })
    
    doc.line(10, 28, pageWidth - 10, 28)
    
    doc.setFontSize(fontSizeTitle)
    doc.setFont("helvetica", "bold")
    doc.text(currentTitulo, pageWidth / 2, 38, { align: "center" })
    
    // --- CABEÇALHO PROFISSIONAL ---
    
    // Configurações de Posição
    const leftMargin = 15
    const rightMargin = pageWidth - 15
    const headerStart = 45
    
    // Dados do Aluno (Linha 1)
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("ESTUDANTE:", leftMargin, headerStart + 5)
    
    // Linha para nome (Estende até perto da caixa de nota)
    const noteBoxWidth = 25
    const nameLineEnd = rightMargin - noteBoxWidth - 5
    doc.setLineWidth(0.1)
    doc.line(leftMargin + 25, headerStart + 6, nameLineEnd, headerStart + 6)
    
    // Caixa de Nota (Estilo mais limpo)
    doc.setDrawColor(0)
    doc.rect(rightMargin - noteBoxWidth, headerStart, noteBoxWidth, 18)
    // Pequeno header para a nota
    doc.line(rightMargin - noteBoxWidth, headerStart + 6, rightMargin, headerStart + 6)
    doc.setFontSize(7)
    doc.text("NOTA", rightMargin - (noteBoxWidth/2), headerStart + 4, { align: "center" })
    
    // Linha 2 (Curso, Turma, Data)
    const row2Y = headerStart + 14
    
    // Curso
    doc.setFontSize(8)
    doc.text(`CURSO: ${currentTurma.curso || ''}`, leftMargin, row2Y)
    
    // Unidade
    const formatUnidade = unidade ? `${unidade}ª UNIDADE` : ''

    // Turma (Calculado para ficar visualmente distribuído)
    // Formatando subtitulo central (Turma + Unid.)
    const turmaCentralText = [currentTurma.nome, formatUnidade].filter(Boolean).join("  •  ")
    const turmaX = pageWidth / 2
    doc.text(turmaCentralText, turmaX, row2Y, { align: "center" })
    
    // Valor
    if (valorQuestao) {
      doc.text(`VALOR P/ QUESTÃO: ${valorQuestao}`, rightMargin - noteBoxWidth - 10, row2Y, { align: "right" })
    } else {
      doc.text(`DATA: ____/____/2026`, rightMargin - noteBoxWidth - 10, row2Y, { align: "right" })
    }

    // Linha divisória robusta
    doc.setLineWidth(0.5)
    doc.line(leftMargin, headerStart + 22, rightMargin, headerStart + 22)
    doc.setLineWidth(0.1) // Reset

    // --- INSTRUÇÕES ---
    const instructionsY = headerStart + 32
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("Orientações para os alunos:", leftMargin, instructionsY)
    
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    const rules = [
      "• Leia a avaliação com atenção e revise-a ao finalizar.",
      "• Todas as questões objetivas têm apenas uma resposta correta.",
      "• Preencha o cartão de respostas com caneta preta ou azul. Não utilize lápis ou corretivo. Rasuras invalidam a questão.",
      "• É estritamente proibida a consulta a materiais não autorizados ou a comunicação entre alunos.",
      "• O uso de dispositivos eletrônicos (como celular, calculadoras ou smartwatches) resultará na anulação da prova.",
      "• A avaliação terá duração de 1 hora e 30 minutos.",
      "• Tempo mínimo de permanência em sala: 30 minutos."
    ]
    
    let ruleY = instructionsY + 6
    rules.forEach(rule => {
      const lines = doc.splitTextToSize(rule, pageWidth - 40)
      doc.text(lines, leftMargin + 5, ruleY)
      ruleY += (lines.length * 4.5) + 1.5
    })

    // --- GABARITO (Estilo Listrado e Blocos) ---
    const gabaritoStartY = ruleY + 8
    
    // Header do Gabarito
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(0, 0, 0)
    doc.text("GABARITO", leftMargin, gabaritoStartY)
    
    // Configurações do Grid
    const rowHeight = 6.2 
    const colWidth = 50   
    const colGap = 6
    const maxRowsPerCol = 20 // Se for 50 questoes, vai dar 3 colunas (20, 20, 10)
    
    const startGridY = gabaritoStartY + 10
    
    // Calcula quantas colunas de bloco precisamos
    const totalCols = Math.ceil(questionsToUse.length / maxRowsPerCol)
    
    // Centraliza o bloco total de colunas na página
    const totalWidth = (totalCols * colWidth) + ((totalCols - 1) * colGap)
    const startX = (pageWidth - totalWidth) / 2
    
    let currentQIndex = 0
    
    for (let c = 0; c < totalCols; c++) {
       const colX = startX + (c * (colWidth + colGap))
       const colY = startGridY
       
       const rowsinThisCol = Math.min(maxRowsPerCol, questionsToUse.length - currentQIndex)
       const colHeight = rowsinThisCol * rowHeight
       
       // Loop das linhas (Desenha fundos e conteúdos)
       for (let r = 0; r < rowsinThisCol; r++) {
          const qIdx = currentQIndex + r
          const q = questionsToUse[qIdx]
          const rowY = colY + (r * rowHeight)
          
          if (r % 2 !== 0) {
             doc.setFillColor(240, 240, 240)
             doc.rect(colX, rowY, colWidth, rowHeight, 'F')
          }
          
          const numBoxW = 10 
          doc.setDrawColor(0)
          doc.setLineWidth(0.1) // Linha interna mais fina
          doc.line(colX + numBoxW, rowY, colX + numBoxW, rowY + rowHeight)
          
          doc.setFontSize(9)
          doc.setFont("helvetica", "bold")
          doc.setTextColor(0, 0, 0)
          const numStr = String(qIdx + 1).padStart(2, '0')
          doc.text(numStr, colX + (numBoxW/2), rowY + 4.5, { align: "center" })
          
          const bubbleStartX = colX + numBoxW + 5
          const bubbleGap = 7 
          const bubbleSize = 2.3 
          
          const alternatives = ['A', 'B', 'C', 'D', 'E']
          alternatives.forEach((letter, ai) => {
             const bx = bubbleStartX + (ai * bubbleGap)
             const by = rowY + (rowHeight/2)
             
             doc.setLineWidth(0.1)
             doc.setDrawColor(0)
             
             if ((options?.preenchido || options?.apenasGabarito) && q.correta === letter) {
                doc.setFillColor(0, 0, 0)
                doc.circle(bx, by, bubbleSize, 'F')
                doc.setTextColor(255, 255, 255)
             } else {
                doc.circle(bx, by, bubbleSize, 'S')
                doc.setTextColor(0, 0, 0)
             }
             
             doc.setFontSize(6)
             doc.setFont("helvetica", "normal")
             doc.text(letter, bx, by + 1, { align: "center", baseline: "bottom" })
          })
          doc.setTextColor(0, 0, 0)
       }
       
       // Desenha Borda da Coluna (POR ÚLTIMO para ficar por cima das listras)
       doc.setDrawColor(0)
       doc.setLineWidth(0.3)
       doc.rect(colX, colY, colWidth, colHeight)
       
       currentQIndex += rowsinThisCol
    }

     if (options?.apenasGabarito) {
        // Se for apenas o gabarito, salvamos e saímos aqui
        const fileName = `GABARITO_${currentTurma.nome.replace(/\s/g, '_')}_${currentTitulo.replace(/\s/g, '_')}.pdf`
        doc.save(fileName)
        return
    }

    doc.addPage() // Pula para a página das questões

    // Questões
    let yPos = 20 // Reset yPos para nova página
    let currentColumn = 0
    let xOffset = 15

    questionsToUse.forEach((q: any, i: number) => {
      // Configurações de fonte
      doc.setFontSize(fontSizeBase)
      const lineHeight = fontSizeBase * 0.5 // Aproximação da altura da linha

      // Função auxiliar para verificar espaço
      const checkSpace = (heightNeeded: number) => {
        if (yPos + heightNeeded > pageHeight - 15) {
          if (currentLayoutColunas === 2 && currentColumn === 0) {
            currentColumn = 1
            xOffset = (pageWidth / 2) + (colSpacing / 2)
            yPos = 20
          } else {
            doc.addPage()
            yPos = 20
            currentColumn = 0
            xOffset = 15
          }
        }
      }

      // 1. Título da Questão
      const qTitle = `Questão ${i + 1})`
      doc.setFont("helvetica", "bold")
      
      checkSpace(lineHeight + 2)
      doc.text(qTitle, xOffset, yPos)
      yPos += lineHeight + 2

      // 2. Enunciado (Linha a Linha)
      doc.setFont("helvetica", "normal")
      const rawEnunciado = stripHtml(q.enunciado)
      const qEnunciadoLines = doc.splitTextToSize(rawEnunciado, currentColWidth)
      
      qEnunciadoLines.forEach((line: string) => {
        checkSpace(lineHeight)
        doc.text(line, xOffset, yPos)
        yPos += lineHeight
      })
      yPos += 2 // Espaço após enunciado

      // 3. Imagem
      if (q.imagemUrl) {
         const imgMaxHeight = 50
         const imgWidth = Math.min(currentColWidth - 10, 80)
         const imgHeight = imgMaxHeight
         
         checkSpace(imgHeight + 5)
         
         try {
           const imgX = xOffset + (currentColWidth - imgWidth) / 2
           doc.addImage(q.imagemUrl, 'JPEG', imgX, yPos, imgWidth, imgHeight, undefined, 'FAST')
           yPos += imgHeight + 5
         } catch (e) {
           console.error("Erro imagem", e)
         }
      }

      // 4. Nota (Muleta)
      if (q.muleta) {
        doc.setFont("helvetica", "italic")
        const muletaLines = doc.splitTextToSize(`Nota: ${q.muleta}`, currentColWidth)
        muletaLines.forEach((line: string) => {
            checkSpace(lineHeight)
            doc.text(line, xOffset, yPos)
            yPos += lineHeight
        })
        yPos += 2
        doc.setFont("helvetica", "normal")
      }

      // 5. Alternativas
      const alternativesIds = ['a', 'b', 'c', 'd', 'e']
      const originalIds = ['A', 'B', 'C', 'D', 'E']
      
      alternativesIds.forEach((letter, idx) => {
        // Limpa qualquer bug de encoding ou tag escondida nas alternativas
        const altContent = stripHtml(q[`alternativa${originalIds[idx]}`] || "")
        // Prepara texto da alternativa
        const altLines = doc.splitTextToSize(`${letter}) ${altContent}`, currentColWidth - 5)
        
        altLines.forEach((line: string) => {
            checkSpace(lineHeight)
            doc.text(line, xOffset + 5, yPos)
            yPos += lineHeight
        })
        yPos += 2 // Espaço entre alternativas
      })

      yPos += 4 // Margem final entre questões
    })

    // --- Finalização do PDF: Numeração e Delimitadores ---
    const totalPages = (doc as any).getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      
      // Numeração de Página
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.setFont("helvetica", "normal")
      const pageText = `Página ${i} de ${totalPages}`
      doc.text(pageText, pageWidth / 2, pageHeight - 7, { align: "center" })

      // Delimitador de Colunas (Apenas se layout for 2 e for página de questões)
      // Página 1 geralmente é capa/intro, então começamos a desenhar da 2 em diante (ou onde começam as questões)
      if (currentLayoutColunas === 2 && i > 1) {
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.1)
        doc.line(pageWidth / 2, 10, pageWidth / 2, pageHeight - 10)
      }
    }


    const fileName = options?.apenasGabarito 
        ? `GABARITO_${currentTurma.nome.replace(/\s/g, '_')}_${currentTitulo.replace(/\s/g, '_')}.pdf`
        : `PROVA_${currentTurma.nome.replace(/\s/g, '_')}${finalAmpliada ? '_AMPLIADA' : ''}.pdf`

    doc.save(fileName)


  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Scissors className="text-indigo-600" />
            Gerador de Provas
          </h1>
          <p className="text-gray-500 mt-2 text-sm">Crie ou gerencie suas avaliações profissionais.</p>
        </div>

        <div className="flex flex-wrap bg-gray-100 p-1.5 rounded-2xl shadow-inner gap-1 w-full sm:w-auto overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('gerador')}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'gerador'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Plus size={18} />
            Gerador
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'historico'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <HistoryIcon size={18} />
            Histórico
          </button>

        </div>
      </div>

      {activeTab === 'gerador' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Configuração */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Título da Prova</label>
              <input 
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Ex: AVALIAÇÃO BIMESTRAL"
              />
            </div>

            {/* Filtros de Turma */}
            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 space-y-3">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Filtrar Turmas</label>
              <div className="grid grid-cols-2 gap-3">
                <select 
                  value={filterCurso}
                  onChange={(e) => setFilterCurso(e.target.value)}
                  className="bg-white border-none rounded-lg px-3 py-2 text-xs font-bold text-gray-600 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os Cursos</option>
                  {uniqueCursos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select 
                  value={filterTurno}
                  onChange={(e) => setFilterTurno(e.target.value)}
                  className="bg-white border-none rounded-lg px-3 py-2 text-xs font-bold text-gray-600 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os Turnos</option>
                  {uniqueTurnos.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <input 
                value={filterNomeTurma}
                onChange={(e) => setFilterNomeTurma(e.target.value)}
                placeholder="Filtrar por nome..."
                className="w-full bg-white border-none rounded-lg px-3 py-2 text-xs font-bold text-gray-600 focus:ring-2 focus:ring-blue-500 placeholder:font-normal"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                Selecionar Turma {filteredTurmas.length < turmas.length && <span className="text-blue-500">({filteredTurmas.length} encontradas)</span>}
              </label>
              <select 
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                onChange={(e) => setSelectedTurma(turmas.find((t: any) => t.id === e.target.value))}
                value={selectedTurma?.id || ""}
              >
                <option value="">Selecione a turma...</option>
                {filteredTurmas.map((t: any) => (
                    <option key={t.id} value={t.id}>
                        {t.nome} ({t._count?.questoes || 0} questões)
                    </option>
                ))}
              </select>
              {selectedTurma && (
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-xs text-blue-600 font-bold ml-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        {selectedTurma._count?.questoes || 0} questões específicas
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Unidade:</span>
                      <select 
                        value={unidade}
                        onChange={(e) => setUnidade(e.target.value)}
                        className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[10px] font-bold text-indigo-600 focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">Todas</option>
                        <option value="1">1ª Unid.</option>
                        <option value="2">2ª Unid.</option>
                      </select>
                    </div>
                  </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Formato e Acessibilidade</label>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button 
                    onClick={() => setLayoutColunas(1)}
                    disabled={isAmpliada}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                      layoutColunas === 1 && !isAmpliada
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-400 hover:text-gray-600'
                    } disabled:opacity-30`}
                  >
                    1 Coluna
                  </button>
                  <button 
                    onClick={() => setLayoutColunas(2)}
                    disabled={isAmpliada}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                      layoutColunas === 2 && !isAmpliada
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-400 hover:text-gray-600'
                    } disabled:opacity-30`}
                  >
                    2 Colunas
                  </button>
                </div>

                <button 
                  onClick={() => setIsAmpliada(!isAmpliada)}
                  className={`flex-1 flex items-center justify-between gap-3 px-4 py-2 rounded-xl border-2 transition-all group ${
                    isAmpliada 
                    ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm' 
                    : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-amber-200 hover:text-amber-500'
                  }`}
                >
                  <div className="flex items-center gap-2 text-left">
                    <Eye size={16} className={isAmpliada ? 'text-amber-600' : 'text-gray-400 group-hover:text-amber-500'} />
                    <div>
                      <p className="text-[11px] font-bold leading-tight">Prova Ampliada</p>
                      <p className="text-[9px] font-medium opacity-70 leading-tight">Acessibilidade</p>
                    </div>
                  </div>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${isAmpliada ? 'bg-amber-500' : 'bg-gray-200'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isAmpliada ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Valor por Questão no PDF</label>
              <input 
                value={valorQuestao}
                onChange={(e) => setValorQuestao(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 focus:ring-1 focus:ring-blue-500 transition-all placeholder:font-normal"
                placeholder="Ex: 0,5 pts"
              />
            </div>

            {selectedTurma && (
              <div className="space-y-4 pt-4 border-t border-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Questões por Disciplina</label>
                  <button 
                    onClick={() => {
                      const qtd = prompt("Quantidade de questões para cada disciplina:")
                      if (qtd !== null) {
                        const n = parseInt(qtd) || 0
                        setConfig(config.map(c => ({ ...c, qtd: n })))
                      }
                    }}
                    className="text-[10px] font-bold text-indigo-600 hover:underline uppercase"
                  >
                    Definir p/ Todas
                  </button>
                </div>
                <div className="space-y-3">
                  {config.map((c, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                           <span className="text-sm font-medium text-gray-700 truncate max-w-[150px]">{c.nome}</span>
                           <span className="text-[10px] font-bold text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-200" title="Questões disponíveis especificamente para esta matéria nesta turma">
                             {availableQuestions.filter((q: any) => 
                               q.disciplinas?.some((d: any) => {
                                 const qNome = d.nome?.trim().toLowerCase() || "";
                                 const fNome = c.nome?.trim().toLowerCase() || "";
                                 return qNome === fNome;
                               })
                             ).length}
                           </span>
                        </div>
                        <button 
                          onClick={async () => {
                            setLoading(true)
                            try {
                              const res = await fetch(`/api/questoes?turmaId=${selectedTurma.id}&disciplinaId=${c.disciplinaId}&status=APROVADA`)
                              const data = await res.json()
                              setAvailableQuestions(prev => {
                                // Mergia questões novas sem duplicar IDs
                                const map = new Map(prev.map(q => [q.id, q]))
                                data.forEach((q: any) => map.set(q.id, q))
                                return Array.from(map.values())
                              })
                              setManualSelector({ isOpen: true, discId: c.disciplinaId, discNome: c.nome })
                            } finally {
                              setLoading(false)
                            }
                          }}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 uppercase tracking-tighter"
                        >
                          <Search size={10} /> Selecionar Manuais
                        </button>
                      </div>
                      <input 
                        type="number"
                        min="0"
                        value={c.qtd}
                        onChange={(e) => {
                          const newConfig = [...config]
                          newConfig[idx].qtd = parseInt(e.target.value) || 0
                          setConfig(newConfig)
                        }}
                        className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1 text-center font-bold text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <p className="text-xs text-center text-gray-400 mb-4">Total de Questões: <span className="font-bold text-indigo-600">{config.reduce((acc, c) => acc + c.qtd, 0)}</span></p>
                  <button
                    onClick={handleGenerateDraft}
                    disabled={loading || config.reduce((acc, c) => acc + c.qtd, 0) === 0}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                  >
                    {loading ? <RefreshCw className="animate-spin" size={20} /> : <FileText size={20} />}
                    Gerar Rascunho
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preview / Lista de Questões */}
        <div className="xl:col-span-2 space-y-6">
          {draftQuestions.length > 0 ? (
            <>
              <div className="flex items-center justify-between bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg">
                    {draftQuestions.length}
                  </div>
                  <div>
                    <h3 className="font-bold text-blue-900 leading-tight text-sm">Rascunho Gerado</h3>
                    <p className="text-blue-700 text-xs">Você pode trocar questões individuais ou baixar o PDF.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      const saved = await saveProva()
                      if (saved) alert("Prova salva no histórico com sucesso!")
                    }}
                    disabled={loading || !!lastSavedProva}
                    className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50 ${
                        lastSavedProva 
                        ? "bg-green-50 text-green-600 border border-green-200 cursor-not-allowed" 
                        : "bg-white hover:bg-gray-50 text-indigo-600 border border-indigo-200"
                    }`}
                  >
                    {lastSavedProva ? <CheckCircle2 size={18} /> : <Save size={18} />}
                    {lastSavedProva ? "Salva" : "Salvar"}
                  </button>
                  <button
                    onClick={() => {
                        if (!lastSavedProva) {
                            alert("É necessário salvar a prova antes de gerar o PDF.")
                            return
                        }
                        generatePDF(null)
                    }}
                    disabled={loading}
                    className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50 ${
                        !lastSavedProva ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    <Printer size={18} />
                    PDF
                  </button>

                </div>
              </div>

              <div className="space-y-4">
                {draftQuestions.map((q, idx) => (
                  <div key={`${q.id}-${idx}`} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm group hover:border-blue-200 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-xs font-black text-blue-500 uppercase tracking-widest">Questão {idx + 1} • {q.disciplinas[0]?.nome}</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => swapQuestion(idx)}
                          className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100"
                        >
                          <RefreshCw size={14} /> Trocar
                        </button>
                        <button 
                          onClick={() => {
                            const q = draftQuestions[idx]
                            setDraftQuestions(draftQuestions.filter((_, i) => i !== idx))
                            
                            // Atualiza qtd no config
                            const newConfig = [...config]
                            const discIdx = newConfig.findIndex(c => q.disciplinas.some((d: any) => d.nome === c.nome))
                            if (discIdx > -1) newConfig[discIdx].qtd = Math.max(0, newConfig[discIdx].qtd - 1)
                            setConfig(newConfig)
                          }}
                          className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-red-600 transition-colors bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100"
                        >
                          <Trash2 size={14} /> Remover
                        </button>
                      </div>
                    </div>
                    <div className="text-gray-800 font-medium mb-4 overflow-hidden break-words" dangerouslySetInnerHTML={{ __html: q.enunciado }} />
                    {q.imagemUrl && (
                      <div className="mb-4 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex justify-center">
                        <img 
                          src={q.imagemUrl} 
                          alt="Imagem da questão" 
                          className="max-h-48 object-contain"
                        />
                      </div>
                    )}
                    <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 flex-wrap">
                      {q.unidade && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 uppercase tracking-widest border border-indigo-100">
                          {q.unidade}ª Unidade
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-600 uppercase tracking-widest border border-blue-100">
                        {q.disciplinas[0]?.nome}
                      </span>
                      {q.turmas?.[0] && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-widest border border-slate-200">
                          {q.turmas[0].nome}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-20 text-center flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mb-6">
                <FileText size={40} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Nenhum rascunho ativo</h3>
              <p className="text-gray-500 mt-2 max-w-sm">Configure a quantidade de questões ao lado e clique em "Gerar Rascunho" para começar a montar sua prova.</p>
            </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'historico' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm">
                <HistoryIcon size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 leading-tight">Avaliações Recentes</h2>
                <p className="text-gray-500 text-sm">Registro das últimas provas geradas no sistema.</p>
              </div>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                placeholder="Buscar por título ou turma..."
                value={searchHistory}
                onChange={(e) => setSearchHistory(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          {(!Array.isArray(provasRecentes) || provasRecentes.length === 0) ? (
            <div className="bg-gray-50 rounded-3xl p-12 text-center border-2 border-dashed border-gray-200">
              <p className="text-gray-400 font-medium">Nenhuma avaliação registrada ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
              {provasRecentes.map((p: any) => (
                <div key={p.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest border border-emerald-100">
                      {p.turma?.nome}
                    </span>
                    <div className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">{p.titulo}</h3>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <FileText size={14} className="text-gray-400" />
                      <span>{p.questoes.length} Questões</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <UserIcon size={14} className="text-gray-400" />
                      <span>Criado por: {p.professorCriador?.name || 'Sistema'}</span>
                    </div>
                    {p.savedByUser && (
                        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2 py-1.5 rounded-md mt-1 font-medium border border-blue-100">
                          <Save size={12} />
                          <span>Salvo por <b className="font-bold">{p.savedByUser.name}</b> às {new Date(p.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        editExistingProva(p)
                        setActiveTab('gerador')
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-sm font-bold transition-all border border-blue-100"
                      title="Criar cópia para editar"
                    >
                      <Copy size={16} />
                      Editar
                    </button>
                    <button 
                      onClick={async () => {
                        setLoading(true)
                        try {
                          const res = await fetch(`/api/provas/${p.id}`)
                          if (!res.ok) throw new Error("Não foi possível carregar os detalhes.")
                          const fullProva = await res.json()
                          setViewingProva(fullProva)
                        } catch (error) {
                          console.error(error)
                          alert("Erro ao carregar detalhes da prova.")
                        } finally {
                          setLoading(false)
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-bold transition-all border border-indigo-100"
                    >
                      <Eye size={16} />
                      Ver
                    </button>

                    <button 
                      onClick={() => deleteProva(p.id)}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all border border-red-100"
                      title="Excluir prova"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

              ))}
            </div>
          )}
        </div>
      )}


      
      <ManualSelectorModal 
        isOpen={manualSelector.isOpen}
        onClose={() => setManualSelector({ ...manualSelector, isOpen: false })}
        disciplinaNome={manualSelector.discNome}
        questions={availableQuestions.filter(q => q.disciplinas?.some((d: any) => d.nome?.trim().toLowerCase() === manualSelector.discNome?.trim().toLowerCase()))}
        selectedIds={draftQuestions.filter(dq => dq.disciplinas?.some((d: any) => d.nome?.trim().toLowerCase() === manualSelector.discNome?.trim().toLowerCase())).map(q => q.id)}
        onFetchSerie={async () => {
          if (!selectedTurma?.serie) {
            alert("Esta turma não possui informação de série cadastrada.")
            return
          }
          try {
            const res = await fetch(`/api/questoes?serie=${selectedTurma.serie}&disciplinaNome=${manualSelector.discNome}&status=APROVADA`)
            const data = await res.json()
            
            if (data.length === 0) {
              alert(`Nenhuma questão adicional de ${manualSelector.discNome} foi encontrada em outras turmas do ${selectedTurma.serie}º ano.`)
              return
            }

            setAvailableQuestions(prev => {
              const map = new Map(prev.map(q => [q.id, q]))
              data.forEach((q: any) => map.set(q.id, q))
              return Array.from(map.values())
            })
            
            alert(`${data.length} questões de outras turmas foram adicionadas à lista!`)
          } catch (error) {
            console.error(error)
            alert("Erro ao buscar questões de outras turmas.")
          }
        }}
        onSelect={(q: any) => {
          const isSelected = draftQuestions.some(dq => dq.id === q.id)
          if (isSelected) {
            setDraftQuestions(draftQuestions.filter(dq => dq.id !== q.id))
            // Atualiza qtd no config também
            const newConfig = [...config]
            const idx = newConfig.findIndex(c => c.disciplinaId === manualSelector.discId)
            if (idx > -1) newConfig[idx].qtd = Math.max(0, newConfig[idx].qtd - 1)
            setConfig(newConfig)
          } else {
            setDraftQuestions([...draftQuestions, q])
            const newConfig = [...config]
            const idx = newConfig.findIndex(c => c.disciplinaId === manualSelector.discId)
            if (idx > -1) newConfig[idx].qtd += 1
            setConfig(newConfig)
          }
        }}
      />



      <PreviewProvaModalWithConfig 
        isOpen={!!viewingProva}
        onClose={() => setViewingProva(null)}
        prova={viewingProva}
        onDownload={(opts: any) => generatePDF(viewingProva, opts)}
        onDelete={() => viewingProva?.id && deleteProva(viewingProva.id)}
      />
    </div>
  )
}

const PreviewProvaModalWithConfig = ({ isOpen, onClose, prova, onDownload, onDelete }: any) => {

  const [localLayout, setLocalLayout] = useState<1 | 2>(1)
  const [localAmpliada, setLocalAmpliada] = useState(false)

  if (!isOpen || !prova) return null

  const questoes = prova.questoes || []

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white text-gray-900">
          <div>
            <h2 className="text-xl font-bold">{prova.titulo}</h2>
            <p className="text-sm text-gray-500">{prova.turma?.nome} • {questoes.length} Questões</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <X size={24} className="text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50/30">
          {questoes.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <p>Carregando detalhes das questões...</p>
            </div>
          ) : (
            questoes.map((q: any, idx: number) => (
              <div key={q.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 block">Questão {idx + 1}</span>
                <div className="text-gray-800 font-medium mb-4 leading-relaxed" dangerouslySetInnerHTML={{ __html: q.enunciado }} />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {['A', 'B', 'C', 'D', 'E'].map(letter => (
                    <div key={letter} className={`p-3 rounded-xl border flex gap-3 ${
                      q.correta === letter 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700 font-bold' 
                      : 'bg-gray-50 border-gray-50 text-gray-500'
                    }`}>
                      <span className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] ${
                        q.correta === letter ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {letter}
                      </span>
                      {q[`alternativa${letter}`] && (
                        <div dangerouslySetInnerHTML={{ __html: q[`alternativa${letter}`] }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-gray-100 bg-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Formato</label>
              <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                <button 
                  onClick={() => setLocalLayout(1)}
                  disabled={localAmpliada}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    localLayout === 1 && !localAmpliada
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-400 hover:text-gray-600'
                  } disabled:opacity-30`}
                >
                  1 Coluna
                </button>
                <button 
                  onClick={() => setLocalLayout(2)}
                  disabled={localAmpliada}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    localLayout === 2 && !localAmpliada
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-400 hover:text-gray-600'
                  } disabled:opacity-30`}
                >
                  2 Colunas
                </button>
              </div>
            </div>

            <button 
              onClick={() => setLocalAmpliada(!localAmpliada)}
              className={`flex items-center gap-3 px-4 py-1.5 rounded-xl border-2 transition-all group ${
                localAmpliada 
                ? 'bg-amber-50 border-amber-500 text-amber-700' 
                : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-amber-200'
              }`}
            >
              <div className="flex items-center gap-2 text-left">
                <Eye size={16} className={localAmpliada ? 'text-amber-600' : 'text-gray-400 group-hover:text-amber-500'} />
                <div>
                  <p className="text-[11px] font-bold leading-tight">Prova Ampliada</p>
                  <p className="text-[9px] font-medium opacity-70 leading-tight">Acessibilidade</p>
                </div>
              </div>
              <div className={`w-8 h-4 rounded-full relative transition-colors ${localAmpliada ? 'bg-amber-500' : 'bg-gray-200'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${localAmpliada ? 'right-0.5' : 'left-0.5'}`} />
              </div>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto">
            <button 
              onClick={onDelete}
              className="px-3 py-2 text-xs font-bold text-red-500 hover:text-red-700 transition-colors flex items-center gap-1.5"
            >
              <Trash2 size={16} />
              Excluir
            </button>
            <button 
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors mr-2"
            >
              Fechar
            </button>
            
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => onDownload({ layout: localLayout, ampliada: localAmpliada })}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-emerald-100 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <FileDown size={16} />
                Gerar PDF
              </button>
              
              <button 
                onClick={() => onDownload({ layout: localLayout, ampliada: localAmpliada, apenasGabarito: true })}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                title="Gerar apenas o Gabarito do Professor"
              >
                <ClipboardCheck size={16} />
                Gerar Gabarito
              </button>
              
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
