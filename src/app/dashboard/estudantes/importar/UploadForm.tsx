"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Upload, FileText, AlertCircle, CheckCircle, FileType, Search, X } from "lucide-react"
import { useEffect, useRef } from "react"

interface PreviewData {
  nome: string
  turma: string
  matricula?: string
}

interface UploadFormProps {
  turmas: { id: string; nome: string; modalidade?: string | null; turno?: string | null }[]
}

export default function UploadForm({ turmas }: UploadFormProps) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewData[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [manualTurma, setManualTurma] = useState("")
  const [turmaSearch, setTurmaSearch] = useState("")
  const [showTurmaDropdown, setShowTurmaDropdown] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter turmas based on search
  const filteredTurmas = turmas.filter(t => 
    t.nome.toLowerCase().includes(turmaSearch.toLowerCase())
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTurmaDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const extractTextFromPDF = async (file: File): Promise<string> => {
    // Dynamic import to prevent "DOMMatrix is not defined" during SSR
    const pdfjsLib = await import('pdfjs-dist')
    
    // Configure worker
    // Use unpkg with specific mjs build for the worker to match ES module environment
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise
    let fullText = ''

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const strings = textContent.items.map((item: any) => item.str)
        fullText += strings.join(' ') + '\n'
    }
    return fullText
  }

  const parsePDFContent = (text: string, defaultTurma: string): PreviewData[] => {
    const students: PreviewData[] = []
    
    let detectedTurma = defaultTurma
    if (!detectedTurma) {
        const turmaMatch = text.match(/(TÉCNICO.*SÉRIE)/i) || text.match(/(.*ENSINO MÉDIO.*)/i)
        if (turmaMatch) {
            detectedTurma = turmaMatch[0].trim()
        }
    }

    // Identifica matricula e nome
    const studentRegex = /(\d{7,})\s+([A-ZÀ-Ú\s]+?)\s+(MATRICULADO|TRANSFERIDO|DESISTENTE|CONCLUÍDO)/g
    let match
    
    while ((match = studentRegex.exec(text)) !== null) {
      if (match[2] && match[2].length > 3) {
        students.push({
          matricula: match[1],
          nome: match[2].trim(),
          turma: detectedTurma || "Turma Desconhecida"
        })
      }
    }
    
    if (students.length === 0) {
        const simpleRegex = /(\d{7,})\s+([A-ZÀ-Ú\s]{5,})/g
        while ((match = simpleRegex.exec(text)) !== null) {
             const nomePotencial = match[2].trim()
             if (!nomePotencial.includes("ESCOLA") && !nomePotencial.includes("DIRETOR") && !nomePotencial.includes("TURMA")) {
                 students.push({
                    matricula: match[1],
                    nome: nomePotencial,
                    turma: detectedTurma || "Turma Desconhecida"
                 })
             }
        }
    }

    return students
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setMessage(null)
    setPreview([])

    if (selectedFile.name.endsWith('.csv')) {
        const text = await selectedFile.text()
        const lines = text.split('\n').filter(line => line.trim())
        if (lines.length <= 1) {
            setMessage({ type: 'error', text: 'O arquivo CSV está vazio' })
            return
        }
        const data: PreviewData[] = []
        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(',').map(s => s.trim())
            
            // Suporta [matricula, nome, turma] ou [nome, turma]
            if (parts.length >= 3) {
                data.push({ matricula: parts[0], nome: parts[1], turma: parts[2] || manualTurma || "Sem Turma" })
            } else if (parts.length === 2) {
                data.push({ nome: parts[0], turma: parts[1] || manualTurma || "Sem Turma" })
            }
        }
        setPreview(data)
        setMessage({ type: 'info', text: `${data.length} estudantes encontrados no CSV.` })

    } else if (selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf')) {
        try {
            const text = await extractTextFromPDF(selectedFile)
            const data = parsePDFContent(text, manualTurma)
            
            if (data.length === 0) {
                setMessage({ type: 'error', text: 'Nenhum estudante identificado no PDF. Verifique o formato.' })
            } else {
                setPreview(data)
                setMessage({ type: 'info', text: `${data.length} estudantes encontrados no PDF.` })
            }
        } catch (err) {
            console.error(err)
            setMessage({ type: 'error', text: 'Erro ao ler o arquivo PDF.' })
        }
    } else {
        setMessage({ type: 'error', text: 'Formato não suportado. Use CSV ou PDF.' })
    }
  }

  const [skippedList, setSkippedList] = useState<string[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || preview.length === 0) return

    setLoading(true)
    setMessage(null)
    setSkippedList([])
    setIsFinished(false)

    try {
      const csvContent = "Matricula,Nome,Turma\n" + preview.map(p => `${p.matricula || ''},${p.nome},${manualTurma || p.turma}`).join("\n")
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const finalFile = new File([blob], "importacao_processada.csv", { type: 'text/csv' })

      const formData = new FormData()
      formData.append('file', finalFile)

      const response = await fetch('/api/upload-csv', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (response.ok) {
        if (result.created > 0) {
            setMessage({ 
              type: 'success', 
              text: `${result.created} estudantes cadastrados com sucesso!` 
            })
            if (result.skipped && result.skipped.length > 0) {
                setSkippedList(result.skipped)
            }
            setFile(null)
            setPreview([])
            setIsFinished(true)
            // Removido redirecionamento automático a pedido do usuário
        } else {
            setMessage({ 
                type: 'info', 
                text: result.message || 'Nenhum novo estudante foi cadastrado.' 
            })
            if (result.skipped) setSkippedList(result.skipped)
            setIsFinished(true)
        }
      } else {
        setMessage({ type: 'error', text: result.message || 'Erro ao processar dados' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao conectar com o servidor' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white shadow-sm border-b border-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/estudantes" className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </Link>
            <div>
              <h1 className="text-2xl font-medium text-blue-900">Importar Estudantes</h1>
              <p className="text-sm text-slate-700">Importe via CSV ou PDF (Relação de Alunos)</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-slate-100 border border-slate-300 rounded-xl p-6 mb-8">
          <div className="flex items-start space-x-4">
            <div className="bg-slate-200 rounded-lg p-3">
              <FileType className="w-6 h-6 text-slate-800" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-blue-900 mb-2">Instruções de Importação</h3>
              <div className="space-y-4 text-blue-800 text-sm">
                <p>
                  Para importar vários alunos de uma vez, utilize o arquivo PDF <strong>"Relação de Estudantes na Turma"</strong> baixado diretamente do <strong>SIGEDUC</strong>.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                   <li>O sistema extrairá os <strong>nomes</strong> e <strong>números de matrícula</strong> automaticamente.</li>
                   <li>A matrícula será usada para identificar o aluno e o acesso ao portal virá desativado por padrão.</li>
                   <li>É necessário selecionar a <strong>Turma de Destino</strong> abaixo para vincular os alunos.</li>
                </ul>
                
                <div className="mt-4">
                    <p className="font-medium mb-2 text-blue-900">Exemplo de arquivo aceito:</p>
                    <div className="border-2 border-slate-300 rounded-lg overflow-hidden shadow-sm max-w-2xl">
                        <img 
                            src="/assets/exemplo-pdf.png" 
                            alt="Exemplo de Relação de Estudantes do SIGEDUC" 
                            className="w-full h-auto"
                        />
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-300 p-6">
          {isFinished ? (
            <div className="py-10 text-center animate-in fade-in zoom-in-95 duration-300">
               {message?.type === 'success' ? (
                 <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                   <CheckCircle className="w-10 h-10" />
                 </div>
               ) : (
                 <div className="w-20 h-20 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-6">
                   <FileType className="w-10 h-10" />
                 </div>
               )}
               
               <h3 className="text-2xl font-bold text-slate-900 mb-2">{message?.text}</h3>
               <p className="text-slate-600 mb-8 font-medium">O processo de importação foi finalizado com base nos dados fornecidos.</p>

               {skippedList.length > 0 && (
                <div className="max-w-md mx-auto mb-10 p-6 bg-slate-50 rounded-2xl border border-slate-200 text-left">
                    <div className="flex items-center gap-2 mb-4 text-amber-600">
                       <AlertCircle className="w-5 h-5" />
                       <span className="font-bold text-sm uppercase tracking-tight">Registros ignorados ({skippedList.length})</span>
                    </div>
                    <ul className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {skippedList.map((item: string, i: number) => (
                            <li key={i} className="text-xs text-slate-500 bg-white p-2 rounded-lg border border-slate-100 flex items-center gap-2">
                               <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
                               {item}
                            </li>
                        ))}
                    </ul>
                </div>
               )}

               <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                        setIsFinished(false)
                        setMessage(null)
                        setSkippedList([])
                        setTurmaSearch("")
                        setManualTurma("")
                    }}
                    className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
                  >
                    Nova Importação
                  </button>
                  <Link
                    href="/dashboard/estudantes"
                    className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 border border-slate-300 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95"
                  >
                    Voltar para Estudantes
                  </Link>
               </div>
            </div>
          ) : (
            <>
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 
              message.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' : 
              'bg-slate-100 border border-slate-300 text-blue-800'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                {message.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
                <span className="font-medium">{message.text}</span>
              </div>
              
              {skippedList.length > 0 && (
                <div className="mt-3 ml-7">
                    <p className="text-sm font-medium mb-1">Registros ignorados (Já existem):</p>
                    <ul className="list-disc list-inside text-xs space-y-1 opacity-80">
                        {skippedList.map((item: string, i: number) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
                <label className="block text-sm font-medium text-slate-800 mb-2">Arquivo (PDF da Relação de Alunos)</label>
                <input 
                  type="file" accept=".pdf, application/pdf" 
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                />
            </div>
            <div ref={dropdownRef}>
                <label className="block text-sm font-medium text-slate-800 mb-2">Turma de Destino <span className="text-red-500">*</span></label>
                <div className="relative">
                    <div className="relative group">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${showTurmaDropdown ? 'text-slate-900' : 'text-slate-400'}`} />
                        <input 
                            type="text"
                            placeholder="Digite o nome da turma para buscar..."
                            value={turmaSearch}
                            onChange={(e) => {
                                setTurmaSearch(e.target.value)
                                setShowTurmaDropdown(true)
                                if (manualTurma) setManualTurma("")
                            }}
                            onFocus={() => setShowTurmaDropdown(true)}
                            className={`w-full pl-11 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-slate-500 transition-all bg-white font-medium text-slate-700 outline-none ${!manualTurma && preview.length > 0 ? 'border-red-300 ring-2 ring-red-100' : 'border-blue-300 hover:border-blue-400'}`}
                        />
                        {(turmaSearch || manualTurma) && (
                            <button 
                                type="button"
                                onClick={() => {
                                    setTurmaSearch("")
                                    setManualTurma("")
                                    setShowTurmaDropdown(false)
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {showTurmaDropdown && (
                        <div className="absolute z-50 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-2xl max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200 py-2">
                             {filteredTurmas.length === 0 ? (
                                <div className="px-4 py-6 text-center text-sm text-slate-400 font-medium">
                                    Nenhuma turma encontrada para "{turmaSearch}"
                                </div>
                             ) : (
                                filteredTurmas.map((t) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => {
                                            setManualTurma(t.nome)
                                            setTurmaSearch(t.nome)
                                            setShowTurmaDropdown(false)
                                        }}
                                        className={`w-full text-left px-4 py-3 text-sm transition-all flex items-center justify-between border-b border-slate-50 last:border-none ${
                                            manualTurma === t.nome 
                                            ? 'bg-slate-900 shadow-lg z-10' 
                                            : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex flex-col">
                                            <span className={`font-semibold uppercase tracking-tight ${manualTurma === t.nome ? 'text-white' : 'text-slate-900 font-bold'}`}>
                                                {t.nome}
                                            </span>
                                            {(t.modalidade || t.turno) && (
                                                <span className={`text-[10px] uppercase tracking-widest font-bold mt-0.5 ${manualTurma === t.nome ? 'text-slate-300' : 'text-slate-400'}`}>
                                                    {t.modalidade} {t.turno && `· ${t.turno}`}
                                                </span>
                                            )}
                                        </div>
                                        {manualTurma === t.nome && <CheckCircle className="w-4 h-4 text-white" />}
                                    </button>
                                ))
                             )}
                        </div>
                    )}
                </div>
                <p className="text-xs text-slate-600 mt-2">Pesquise e selecione a turma para onde estes alunos serão importados.</p>
            </div>
          </div>

          {preview.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-blue-900 mb-4">Preview ({preview.length} alunos)</h3>
              <div className="border border-slate-300 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-slate-100 border-b border-slate-300 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">#</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Matrícula</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Nome</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Turma de Destino</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-300">
                    {preview.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-100">
                        <td className="px-6 py-3 text-sm text-slate-600">{index + 1}</td>
                        <td className="px-6 py-3 text-sm text-slate-600 font-mono">{item.matricula || '-'}</td>
                        <td className="px-6 py-3 text-sm text-blue-900 font-medium">{item.nome}</td>
                        <td className="px-6 py-3 text-sm text-slate-700">
                            {manualTurma || <span className="text-red-500 italic">Selecione a turma acima</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <Link href="/dashboard/estudantes" className="px-6 py-3 text-slate-800 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</Link>
            <button 
              type="submit" disabled={loading || preview.length === 0 || !manualTurma.trim()}
              className="flex items-center space-x-2 bg-gradient-to-r from-slate-700 to-slate-700 text-white px-6 py-3 rounded-lg hover:from-slate-800 hover:to-slate-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-5 h-5" />
              <span>{loading ? 'Importando...' : 'Importar Turma'}</span>
            </button>
          </div>
          </>
          )}
        </form>
      </main>
    </div>
  )
}
