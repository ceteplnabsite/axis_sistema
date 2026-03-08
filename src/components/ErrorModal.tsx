"use client"

import { X, AlertCircle } from "lucide-react"

interface ErrorModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message: string
}

export default function ErrorModal({ isOpen, onClose, title = "Atenção", message }: ErrorModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-rose-100 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-rose-500 rounded-xl shadow-lg shadow-rose-200">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-rose-900 tracking-tight">{title}</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-rose-100 rounded-full transition-colors group"
          >
            <X className="w-5 h-5 text-rose-400 group-hover:text-rose-600" />
          </button>
        </div>

        <div className="p-8">
          <p className="text-slate-600 font-medium leading-relaxed">
            {message}
          </p>
          
          <div className="mt-8">
            <button
              onClick={onClose}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-semibold text-sm flex items-center justify-center space-x-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
            >
              <span>Entendido</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
