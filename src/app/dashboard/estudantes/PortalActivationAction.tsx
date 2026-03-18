
"use client"

import { useState } from "react"
import { ShieldCheck, Loader2, Key, X, ShieldAlert } from "lucide-react"
import { createPortalUser, updateMatricula } from "./actions"
import { useRouter } from "next/navigation"

export default function PortalActivationAction({ 
  estudanteId, 
  initialMatricula,
  hasUser 
}: { 
  estudanteId: string, 
  initialMatricula: string | null,
  hasUser: boolean 
}) {
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [matricula, setMatricula] = useState(initialMatricula || "")
  const router = useRouter()

  const handleCreate = async () => {
    if (!matricula) return alert("Digite a matrícula primeiro")
    
    setLoading(true)
    
    // Se a matrícula mudou ou é nova, salva primeiro
    if (matricula !== initialMatricula) {
      const res = await (updateMatricula as any)(estudanteId, matricula)
      if (res.error) {
        alert(res.error)
        setLoading(false)
        return
      }
    }

    const res = await (createPortalUser as any)(estudanteId)
    if (res.error) {
      alert(res.error)
    } else {
      alert("Acesso ao portal ativado com sucesso! Usuário e Senha são o número da matrícula.")
      setIsModalOpen(false)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <>
      <button 
        onClick={() => setIsModalOpen(true)}
        className={`p-2 rounded-xl transition-all ${
          hasUser 
          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
          : 'bg-slate-50 text-slate-400 border border-slate-200 hover:text-slate-900 hover:bg-white'
        }`}
        title={hasUser ? "Portal Ativo" : "Ativar Acesso Estudante"}
      >
        <ShieldCheck size={18} />
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${hasUser ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                      {hasUser ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
                   </div>
                   <div>
                      <h3 className="font-bold text-slate-800 tracking-tight">Gestão de Acesso</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ativação do Portal do Aluno</p>
                   </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              {hasUser ? (
                <div className="space-y-6">
                   <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 text-center">
                      <p className="text-sm font-bold text-emerald-800 leading-tight">Este estudante já possui acesso ativo ao portal.</p>
                      <p className="text-xs text-emerald-600 mt-2">O login e a senha padrões registrados são a matrícula: <strong>{matricula}</strong></p>
                   </div>
                   <button 
                    onClick={() => setIsModalOpen(false)}
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-all"
                   >
                     Entendido
                   </button>
                </div>
              ) : (
                <div className="space-y-6">
                   <p className="text-sm text-slate-600 leading-relaxed font-medium">
                     Para liberar o acesso ao portal, confirme o número de matrícula do estudante. Uma conta será criada automaticamente usando este número como login e senha inicial.
                   </p>
                   
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Matrícula</label>
                      <input 
                        type="text" 
                        value={matricula}
                        onChange={(e) => setMatricula(e.target.value)}
                        placeholder="Número da Matrícula"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-base font-bold text-slate-800 outline-none focus:ring-4 focus:ring-slate-900/5 focus:bg-white transition-all shadow-inner"
                      />
                   </div>

                   <button 
                    onClick={handleCreate}
                    disabled={loading || !matricula}
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 disabled:opacity-50"
                   >
                     {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                     Ativar Acesso Agora
                   </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
