"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  Accessibility, ArrowLeft, Save, Loader2, Info, 
  CheckCircle2, Clock, Phone, AlertCircle, Trash2, 
  ChevronDown, Search, X, ClipboardCheck, GraduationCap
} from "lucide-react"
import { CIDS_AEE } from "@/lib/constants-aee"

export default function AEEProfileClient({ 
  usuario, 
  estudante, 
  perfilExistente,
  jaAtestado 
}: { 
  usuario: any, 
  estudante: any, 
  perfilExistente: any,
  jaAtestado: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const isDirecao = usuario.isDirecao || usuario.isSuperuser
  
  // Estados do formulário
  const [formData, setFormData] = useState({
    cids: perfilExistente?.cids || [],
    condicao: perfilExistente?.condicao || "",
    recomendacoes: perfilExistente?.recomendacoes || "",
    notasDirecao: perfilExistente?.notasDirecao || "",
    contatoEmergencia: perfilExistente?.contatoEmergencia || ""
  })

  const [atestado, setAtestado] = useState(jaAtestado)
  const [cidSearch, setCidSearch] = useState("")

  const handleSave = async () => {
    if (!isDirecao) return
    setLoading(true)
    try {
      const res = await fetch(`/api/estudantes/${estudante.matricula}/aee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        router.refresh()
        alert('Ficha AEE salva com sucesso!')
      }
    } catch {
      alert('Erro ao salvar ficha')
    } finally {
      setLoading(false)
    }
  }

  const handleAtestar = async () => {
    if (isDirecao || atestado) return
    setLoading(true)
    try {
      const res = await fetch(`/api/estudantes/${estudante.matricula}/aee/atestar`, {
        method: 'POST'
      })
      if (res.ok) {
        setAtestado(true)
        router.refresh()
      }
    } catch {
      alert('Erro ao processar aceite')
    } finally {
      setLoading(false)
    }
  }

  const toggleCID = (code: string) => {
    setFormData(prev => ({
      ...prev,
      cids: prev.cids.includes(code)
        ? prev.cids.filter(c => c !== code)
        : [...prev.cids, code]
    }))
  }

  const filteredCIDs = CIDS_AEE.filter(c => 
    c.code.toLowerCase().includes(cidSearch.toLowerCase()) || 
    c.label.toLowerCase().includes(cidSearch.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24">
      {/* Header Premium */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <Accessibility className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">Ficha de Atendimento Especial (AEE)</h1>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{estudante.nome} · Turma {estudante.turma.nome}</p>
              </div>
            </div>
          </div>
          {isDirecao && (
            <button
              onClick={handleSave} disabled={loading}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Ficha
            </button>
          )}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 mt-8 space-y-6">
        
        {/* Banner de Status para o Professor */}
        {!isDirecao && (
           <div className={`p-6 rounded-[2rem] border-2 flex items-center gap-5 transition-all ${
             atestado ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100 animate-pulse'
           }`}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${
                atestado ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
              }`}>
                {atestado ? <CheckCircle2 className="w-8 h-8" /> : <Info className="w-8 h-8" />}
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-bold ${atestado ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {atestado ? 'Leitura Confirmada' : 'Ação Necessária: Confirmar Leitura'}
                </h3>
                <p className={`text-sm font-medium ${atestado ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {atestado 
                    ? `Você atestou a leitura desta ficha em ${new Date(perfilExistente.acknowledgements[0].readAt).toLocaleDateString('pt-BR')}.` 
                    : 'Como professor deste estudante, você precisa ler as recomendações abaixo e confirmar sua ciência no rodapé da página.'}
                </p>
              </div>
              {!atestado && (
                <button 
                  onClick={handleAtestar}
                  className="bg-amber-600 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-amber-700 shadow-lg shadow-amber-200 transition-all"
                >
                  Confirmar Agora
                </button>
              )}
           </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Lado Esquerdo: Diagnóstico e Contatos */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* CID Selection (Direção) ou Visualização (Professor) */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" />
                Diagnóstico (CIDs)
              </h2>
              
              {isDirecao ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" placeholder="Filtrar CIDs..." value={cidSearch}
                      onChange={(e) => setCidSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/10"
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {filteredCIDs.map(c => (
                      <button 
                        key={c.code} onClick={() => toggleCID(c.code)}
                        className={`w-full text-left p-2.5 rounded-xl border-2 transition-all flex items-center gap-3 ${
                          formData.cids.includes(c.code) 
                          ? 'bg-indigo-50 border-indigo-600' 
                          : 'bg-white border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          formData.cids.includes(c.code) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                        }`}>
                          {formData.cids.includes(c.code) && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter leading-none mb-1">{c.code}</p>
                          <p className="text-[11px] font-bold text-slate-700 leading-tight truncate">{c.label}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {formData.cids.length > 0 ? formData.cids.map(code => {
                    const found = CIDS_AEE.find(c => c.code === code)
                    return (
                      <div key={code} className="bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-xl">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{code}</p>
                        <p className="text-xs font-bold text-slate-700">{found?.label || 'Específico'}</p>
                      </div>
                    )
                  }) : <p className="text-xs font-medium text-slate-400 italic">Nenhum CID informado.</p>}
                </div>
              )}
            </div>

            {/* Contato de Emergência */}
            <div className="bg-indigo-900 text-white p-6 rounded-[2rem] shadow-xl shadow-indigo-950/20">
              <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" />
                Contato de Emergência
              </h2>
              {isDirecao ? (
                <input 
                  type="text" value={formData.contatoEmergencia}
                  onChange={(e) => setFormData({...formData, contatoEmergencia: e.target.value})}
                  placeholder="Nome e Telefone..."
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:bg-white/20 transition-all placeholder:text-white/30"
                />
              ) : (
                <p className="text-sm font-bold tracking-tight">{formData.contatoEmergencia || 'Não informado.'}</p>
              )}
            </div>
          </div>

          {/* Lado Direito: Recomendações e Condição */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
              
              {/* Condição do Estudante */}
              <section>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-500" />
                  Contexto / Condição do Estudante
                </h3>
                {isDirecao ? (
                  <textarea 
                    rows={4} value={formData.condicao}
                    onChange={(e) => setFormData({...formData, condicao: e.target.value})}
                    placeholder="Descreva a condição pedagógica e médica do estudante..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] px-6 py-5 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                ) : (
                  <div className="prose prose-slate max-w-none">
                    <p className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{formData.condicao || 'Sem descrição.'}</p>
                  </div>
                )}
              </section>

              {/* Recomendações Pedagógicas */}
              <section className="bg-emerald-50/50 p-6 rounded-[2.5rem] border border-emerald-100">
                <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4" />
                  Orientações para o Professor
                </h3>
                {isDirecao ? (
                  <textarea 
                    rows={6} value={formData.recomendacoes}
                    onChange={(e) => setFormData({...formData, recomendacoes: e.target.value})}
                    placeholder="Orientações sobre avaliações, tempo adicional, fonte ampliada, apoio em sala..."
                    className="w-full bg-white border border-emerald-200 rounded-[2rem] px-6 py-5 text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                  />
                ) : (
                  <div className="p-2">
                    <p className="text-emerald-900 font-bold leading-relaxed whitespace-pre-wrap">{formData.recomendacoes || 'Sem recomendações cadastradas.'}</p>
                  </div>
                )}
              </section>

              {/* Notas da Direção/Coordenação */}
              <section>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                   <GraduationCap className="w-4 h-4 text-purple-500" />
                   Observações da Coordenação
                </h3>
                {isDirecao ? (
                  <textarea 
                    rows={3} value={formData.notasDirecao}
                    onChange={(e) => setFormData({...formData, notasDirecao: e.target.value})}
                    placeholder="Informações administrativas adicionais..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] px-6 py-5 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                ) : (
                  <p className="text-slate-500 text-sm font-medium italic">{formData.notasDirecao || '--'}</p>
                )}
              </section>
            </div>

            {/* Histórico de Ates de Leitura (Só Direção Vê) */}
            {isDirecao && perfilExistente?.acknowledgements?.length > 0 && (
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Docentes que já leram esta ficha</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {perfilExistente.acknowledgements.map((ack: any) => (
                    <div key={ack.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">
                        {ack.user.name?.charAt(0) || 'P'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{ack.user.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Lido em {new Date(ack.readAt).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
