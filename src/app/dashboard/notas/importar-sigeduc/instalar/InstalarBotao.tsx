"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowLeft, Bookmark, MousePointerClick, Send, ShieldCheck } from "lucide-react"
import { codigoBotaoSigeduc } from "@/lib/sigeduc"

export default function InstalarBotao() {
  const link = useRef<HTMLAnchorElement>(null)
  // o React não permite "javascript:" em href; o endereço do favorito é colocado direto no elemento
  useEffect(() => { link.current?.setAttribute('href', codigoBotaoSigeduc(window.location.origin)) }, [])

  const passo = "flex gap-4 items-start bg-white rounded-2xl border border-slate-200 p-5"
  const num = "w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold shrink-0"
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b border-slate-300 -mx-4 -mt-4 md:-mx-8 md:-mt-8 mb-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto py-4 flex items-center gap-4">
          <Link href="/dashboard/notas/importar-sigeduc" className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Botão &ldquo;Enviar ao Áxis&rdquo;</h1>
            <p className="text-sm text-slate-500">Traz as notas da tela do SIGEduc para o Áxis, sem digitar de novo.</p>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto space-y-4 pb-16">
        <div className={passo}>
          <span className={num}>1</span>
          <div className="space-y-3">
            <p className="font-medium text-slate-900">Mostre a barra de favoritos do navegador</p>
            <p className="text-sm text-slate-600">Chrome: <b>Ctrl + Shift + B</b> (Windows) ou <b>Cmd + Shift + B</b> (Mac).</p>
          </div>
        </div>
        <div className={passo}>
          <span className={num}>2</span>
          <div className="space-y-3">
            <p className="font-medium text-slate-900">Arraste este botão até a barra de favoritos</p>
            <a ref={link} href="#" onClick={e => e.preventDefault()} draggable
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-5 py-3 font-semibold shadow-md cursor-grab active:cursor-grabbing">
              <Send size={18} /> Enviar ao Áxis
            </a>
            <p className="text-sm text-slate-600 flex items-center gap-1.5"><MousePointerClick size={15} /> Clique e segure no botão azul, arraste para a barra e solte. Não precisa clicar nele aqui.</p>
          </div>
        </div>
        <div className={passo}>
          <span className={num}>3</span>
          <div className="space-y-2">
            <p className="font-medium text-slate-900">Use no SIGEduc</p>
            <ol className="text-sm text-slate-600 list-decimal ml-4 space-y-1">
              <li>No SIGEduc, abra <b>Diário de Classe Digital → Lançar Notas para Avaliações das Unidades</b> da turma.</li>
              <li>Clique no favorito <b>Enviar ao Áxis</b>. O Áxis abre numa nova aba com as notas das unidades lidas.</li>
              <li>Confira a turma, a disciplina e as diferenças, e clique em <b>Salvar no Áxis</b>.</li>
            </ol>
          </div>
        </div>
        <div className="flex gap-3 items-start bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-900">
          <ShieldCheck size={20} className="shrink-0" />
          <p>O botão <b>só lê</b> a tabela que está na sua tela do SIGEduc (nome e Nota da Unidade). Ele não clica em nada, não altera nada no SIGEduc e não usa sua senha. No Áxis, nada é salvo sem a sua confirmação.</p>
        </div>
        <p className="text-xs text-slate-400 flex items-center gap-1.5"><Bookmark size={13} /> Se o navegador bloquear a nova aba, permita pop-ups para o site do SIGEduc.</p>
      </main>
    </div>
  )
}
