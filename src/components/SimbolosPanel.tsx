"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

const CATEGORIAS = [
  {
    id: "conjuntos",
    label: "Conjuntos",
    simbolos: [
      { s: "∈", t: "Pertence" },
      { s: "∉", t: "Não pertence" },
      { s: "⊂", t: "Subconjunto" },
      { s: "⊃", t: "Contém" },
      { s: "⊄", t: "Não subconjunto" },
      { s: "⊅", t: "Não contém" },
      { s: "⊆", t: "Subconjunto ou igual" },
      { s: "⊇", t: "Contém ou igual" },
      { s: "∩", t: "Interseção" },
      { s: "∪", t: "União" },
      { s: "∅", t: "Vazio" },
      { s: "ℕ", t: "Naturais" },
      { s: "ℤ", t: "Inteiros" },
      { s: "ℚ", t: "Racionais" },
      { s: "ℝ", t: "Reais" },
      { s: "ℂ", t: "Complexos" },
      { s: "{", t: "Chave aberta" },
      { s: "}", t: "Chave fechada" },
    ]
  },
  {
    id: "matematica",
    label: "Matemática",
    simbolos: [
      { s: "±", t: "Mais ou menos" },
      { s: "×", t: "Multiplicação" },
      { s: "÷", t: "Divisão" },
      { s: "≠", t: "Diferente" },
      { s: "≈", t: "Aproximado" },
      { s: "≤", t: "Menor ou igual" },
      { s: "≥", t: "Maior ou igual" },
      { s: "√", t: "Raiz quadrada" },
      { s: "∛", t: "Raiz cúbica" },
      { s: "∞", t: "Infinito" },
      { s: "π", t: "Pi" },
      { s: "α", t: "Alfa" },
      { s: "β", t: "Beta" },
      { s: "γ", t: "Gama" },
      { s: "θ", t: "Theta" },
      { s: "λ", t: "Lambda" },
      { s: "μ", t: "Mi" },
      { s: "σ", t: "Sigma" },
      { s: "Σ", t: "Somatório" },
      { s: "∏", t: "Produtório" },
      { s: "∂", t: "Derivada parcial" },
      { s: "∫", t: "Integral" },
      { s: "△", t: "Delta" },
      { s: "Δ", t: "Delta maiúsc." },
      { s: "²", t: "Quadrado" },
      { s: "³", t: "Cubo" },
      { s: "⁻¹", t: "Inverso" },
      { s: "½", t: "Um meio" },
      { s: "¼", t: "Um quarto" },
      { s: "¾", t: "Três quartos" },
      { s: "⁻", t: "Exp Menos" },
      { s: "⁰", t: "Exp 0" },
      { s: "¹", t: "Exp 1" },
      { s: "⁴", t: "Exp 4" },
      { s: "⁵", t: "Exp 5" },
      { s: "⁶", t: "Exp 6" },
      { s: "⁷", t: "Exp 7" },
      { s: "⁸", t: "Exp 8" },
      { s: "⁹", t: "Exp 9" },
      { s: "⁻³", t: "Exp -3" },
      { s: "⁻⁷", t: "Exp -7" },
      { s: "¹⁸", t: "Exp 18" },
      { s: "⁻¹⁸", t: "Exp -18" },
      { s: "¹⁹", t: "Exp 19" },
      { s: "²⁰", t: "Exp 20" },
      { s: "⁻²⁰", t: "Exp -20" },
      { s: "ₙ", t: "Sub n" },
      { s: "₁", t: "Sub 1" },
      { s: "₂", t: "Sub 2" },
      { s: "₃", t: "Sub 3" },
      { s: "ₓ", t: "Sub x" },
    ]
  },
  {
    id: "logica",
    label: "Lógica",
    simbolos: [
      { s: "∧", t: "E (conjunção)" },
      { s: "∨", t: "Ou (disjunção)" },
      { s: "¬", t: "Negação" },
      { s: "→", t: "Implica" },
      { s: "↔", t: "Bicondicional" },
      { s: "∀", t: "Para todo" },
      { s: "∃", t: "Existe" },
      { s: "∄", t: "Não existe" },
      { s: "⊢", t: "Provável" },
      { s: "⊨", t: "Válido" },
      { s: "≡", t: "Equivalente" },
      { s: "⊕", t: "Ou exclusivo" },
    ]
  },
  {
    id: "quimica",
    label: "Química",
    simbolos: [
      { s: "→", t: "Reação" },
      { s: "⇌", t: "Equilíbrio" },
      { s: "↑", t: "Gás liberado" },
      { s: "↓", t: "Precipitado" },
      { s: "°", t: "Grau" },
      { s: "Å", t: "Angstrom" },
      { s: "ΔH", t: "Entalpia" },
      { s: "²⁻", t: "Carga 2-" },
      { s: "³⁻", t: "Carga 3-" },
      { s: "⁺", t: "Carga +" },
      { s: "²⁺", t: "Carga 2+" },
      { s: "³⁺", t: "Carga 3+" },
      { s: "₂", t: "Sub 2" },
      { s: "₃", t: "Sub 3" },
      { s: "₄", t: "Sub 4" },
      { s: "₆", t: "Sub 6" },
      { s: "α", t: "Alfa" },
      { s: "β", t: "Beta" },
      { s: "γ", t: "Gama" },
      { s: "·", t: "Ponto central" },
      { s: "•", t: "Radical" },
      { s: "‒", t: "Ligação simples" },
      { s: "═", t: "Ligação dupla" },
      { s: "≡", t: "Ligação tripla" },
    ]
  },
  {
    id: "geometria",
    label: "Geometria",
    simbolos: [
      { s: "°", t: "Grau" },
      { s: "′", t: "Minuto" },
      { s: "″", t: "Segundo" },
      { s: "⊥", t: "Perpendicular" },
      { s: "∥", t: "Paralelo" },
      { s: "∠", t: "Ângulo" },
      { s: "△", t: "Triângulo" },
      { s: "□", t: "Quadrado" },
      { s: "○", t: "Círculo" },
      { s: "≅", t: "Congruente" },
      { s: "∼", t: "Semelhante" },
      { s: "↔", t: "Segmento" },
      { s: "→", t: "Semirreta" },
      { s: "π", t: "Pi" },
    ]
  }
]

interface SimbolosProps {
  /** Ref do campo de input/textarea focado (para alternativas) */
  inputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>
  /** Callback para inserir no Quill (para o enunciado) */
  onInsertQuill?: (symbol: string) => void
  /** Callback para alternativas (passa o caractere) */
  onInsert?: (symbol: string) => void
}

export default function SimbolosPanel({ inputRef, onInsertQuill, onInsert }: SimbolosProps) {
  const [open, setOpen] = useState(false)
  const [aba, setAba] = useState("conjuntos")

  const handleClick = (s: string) => {
    if (onInsertQuill) {
      onInsertQuill(s)
      return
    }
    if (onInsert) {
      onInsert(s)
      return
    }
    // Fallback: inserir no elemento atualmente focado
    const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
      const start = el.selectionStart ?? el.value.length
      const end = el.selectionEnd ?? el.value.length
      const newVal = el.value.substring(0, start) + s + el.value.substring(end)
      // Usar setter nativo para acionar o onChange do React
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
      nativeSetter?.call(el, newVal)
      el.dispatchEvent(new Event("input", { bubbles: true }))
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + s.length
        el.focus()
      })
    }
  }

  const categoriaAtual = CATEGORIAS.find(c => c.id === aba) ?? CATEGORIAS[0]

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">𝛴</span>
          <span className="text-xs font-black text-slate-600 uppercase tracking-wider">Símbolos Especiais</span>
          <span className="text-[10px] text-slate-400 font-medium">Mat. · Quím. · Lógica · Conjuntos</span>
        </div>
        {open 
          ? <ChevronUp className="w-4 h-4 text-slate-400" /> 
          : <ChevronDown className="w-4 h-4 text-slate-400" />
        }
      </button>

      {open && (
        <div className="border-t border-slate-200">
          {/* Abas de categorias */}
          <div className="flex overflow-x-auto no-scrollbar border-b border-slate-200 bg-white">
            {CATEGORIAS.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setAba(cat.id)}
                className={`px-4 py-2 text-[11px] font-bold whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  aba === cat.id
                    ? "border-blue-600 text-blue-700 bg-blue-50"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Grade de símbolos */}
          <div className="p-3 flex flex-wrap gap-1.5">
            {categoriaAtual.simbolos.map(({ s, t }) => (
              <button
                key={s + t}
                type="button"
                title={t}
                onClick={() => handleClick(s)}
                className="w-9 h-9 flex items-center justify-center text-base font-medium bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-all active:scale-95 shadow-sm"
              >
                {s}
              </button>
            ))}
          </div>

          <p className="px-3 pb-2.5 text-[10px] text-slate-400 font-medium">
            💡 Passe o mouse sobre o símbolo para ver o nome. Clique para inserir no campo ativo.
          </p>
        </div>
      )}
    </div>
  )
}
