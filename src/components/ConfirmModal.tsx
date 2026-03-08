"use client"

import { X, AlertTriangle, Loader2 } from "lucide-react"

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: "danger" | "warning" | "info"
  loading?: boolean
}

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirmação", 
  message, 
  confirmText = "Confirmar", 
  cancelText = "Cancelar",
  variant = "danger",
  loading = false
}: ConfirmModalProps) {
  if (!isOpen) return null

  const variantStyles = {
    danger: "bg-rose-500 shadow-rose-200 border-rose-100",
    warning: "bg-amber-500 shadow-amber-200 border-amber-100",
    info: "bg-blue-500 shadow-blue-200 border-blue-100"
  }

  const buttonStyles = {
    danger: "bg-rose-600 hover:bg-rose-700",
    warning: "bg-amber-600 hover:bg-amber-700",
    info: "bg-blue-600 hover:bg-blue-700"
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className={`px-8 py-6 flex items-center justify-between border-b ${variant === 'danger' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl shadow-lg ${variantStyles[variant]}`}>
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <h2 className={`text-xl font-semibold tracking-tight ${variant === 'danger' ? 'text-rose-900' : 'text-slate-800'}`}>{title}</h2>
          </div>
          <button 
            disabled={loading}
            onClick={onClose} 
            className="p-2 hover:bg-white/50 rounded-full transition-colors group disabled:opacity-50"
          >
            <X className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
          </button>
        </div>

        <div className="p-8">
          <p className="text-slate-600 font-medium leading-relaxed">
            {message}
          </p>
          
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              disabled={loading}
              onClick={onClose}
              className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-semibold text-sm hover:bg-slate-200 transition-all disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              disabled={loading}
              onClick={onConfirm}
              className={`flex-1 px-6 py-4 text-white rounded-2xl font-semibold text-sm flex items-center justify-center space-x-2 transition-all shadow-xl disabled:opacity-50 ${buttonStyles[variant]}`}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{confirmText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
