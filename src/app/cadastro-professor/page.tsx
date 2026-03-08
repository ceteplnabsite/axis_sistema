"use client"

import { useState } from "react"
import { GraduationCap, Mail, User, ArrowRight, CheckCircle2, Loader2, BookOpen } from "lucide-react"
import Link from "next/link"

export default function RegisterTeacherPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [confirmEmail, setConfirmEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
      setLoading(true)
    setError(null)

    if (email !== confirmEmail) {
      setError("Os e-mails informados não coincidem")
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/public/v1/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email })
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
      } else {
        setError(data.message || "Erro ao solicitar cadastro")
      }
    } catch (err) {
      setError("Erro na conexão com o servidor")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Solicitação Recebida!</h1>
          <p className="text-slate-600 font-medium">
            Olá, <strong>{name}</strong>! Recebemos seus dados. <br />
            Um administrador revisará sua solicitação e, assim que aprovado, você receberá sua senha de acesso por e-mail.
          </p>
          <div className="pt-4">
            <Link 
              href="/login" 
              className="inline-flex items-center gap-2 text-indigo-600 font-semibold hover:gap-3 transition-all"
            >
              Voltar para o Login <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-500 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="bg-white rounded-3xl p-8 md:p-10 shadow-2xl border border-slate-200">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/30 mb-4 rotate-3">
              <GraduationCap className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight text-center leading-none">
              Cadastro de Professor
            </h1>
            <p className="text-slate-400 font-semibold text-[10px] uppercase tracking-[0.2em] mt-2">
              CETEP Litoral Norte
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                <User className="w-3 h-3" /> Nome Completo
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: João da Silva"
                className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                <Mail className="w-3 h-3" /> E-mail Profissional
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                <Mail className="w-3 h-3" /> Confirmar E-mail
              </label>
              <input
                type="email"
                required
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                onPaste={(e) => e.preventDefault()} // Prevent pasting to ensure typing
                placeholder="Repita seu e-mail"
                className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
              />
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-semibold leading-relaxed animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-slate-900 text-white rounded-2xl font-semibold shadow-xl shadow-slate-200 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 group"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  Solicitar Acesso
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <Link href="/login" className="text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-2">
              Já tem acesso? <span className="text-indigo-600">Entrar agora</span>
            </Link>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4 text-slate-500">
           <div className="flex items-center gap-2 text-[11px] font-semibold">
              <BookOpen className="w-3.5 h-3.5" />
              Áxis v2.0
           </div>
           <div className="w-1 h-1 bg-slate-700 rounded-full" />
           <div className="text-[11px] font-semibold uppercase tracking-widest opacity-60">
              Gestão Educacional
           </div>
        </div>
      </div>
    </div>
  )
}
