
"use client"

import { useState } from "react"
import { ShieldCheck, Loader2, Key } from "lucide-react"
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
  const [matricula, setMatricula] = useState(initialMatricula || "")
  const [isEditing, setIsEditing] = useState(!initialMatricula)
  const router = useRouter()

  const handleCreate = async () => {
    if (!matricula) return alert("Digite a matrícula primeiro")
    
    setLoading(true)
    
    // Se a matrícula mudou ou é nova, salva primeiro
    if (matricula !== initialMatricula) {
      const res = await updateMatricula(estudanteId, matricula)
      if (res.error) {
        alert(res.error)
        setLoading(false)
        return
      }
    }

    const res = await createPortalUser(estudanteId)
    if (res.error) {
      alert(res.error)
    } else {
      alert("Acesso ao portal ativado com sucesso! Usuário e Senha são o número da matrícula.")
      setIsEditing(false)
    }
    setLoading(false)
  }

  if (hasUser) {
    return (
      <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
        <ShieldCheck size={14} />
        <span className="text-[10px] font-medium uppercase">Portal Ativo</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {isEditing ? (
        <>
          <input 
            type="text" 
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
            placeholder="Matrícula"
            className="w-24 px-2 py-1 text-[10px] border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-500 outline-none"
          />
          <button
            onClick={handleCreate}
            disabled={loading}
            className="flex items-center gap-1 bg-slate-700 text-white px-2 py-1 rounded-lg text-[10px] font-medium uppercase hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Key size={12} />}
            Ativar
          </button>
        </>
      ) : (
        <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-slate-600">{matricula}</span>
            <button 
              onClick={() => setIsEditing(true)}
              className="text-[10px] font-medium text-slate-700 hover:underline uppercase"
            >
              Ativar Portal
            </button>
        </div>
      )}
    </div>
  )
}
