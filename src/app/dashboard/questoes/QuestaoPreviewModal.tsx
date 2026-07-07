"use client"

import { X } from "lucide-react"

interface QuestaoPreviewModalProps {
  questao: any
  onClose: () => void
}

export default function QuestaoPreviewModal({ questao, onClose }: QuestaoPreviewModalProps) {
  if (!questao) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Visualização da Questão</h2>
            <p className="text-xs text-slate-500 font-medium">Assim que a questão aparecerá na prova impressa</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-rose-100 hover:text-rose-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto bg-white" style={{ fontFamily: 'Times New Roman, Times, serif' }}>
          {/* Cabeçalho Fictício da Prova */}
          <div className="text-center border-b-2 border-black pb-4 mb-6">
            <h3 className="font-bold text-lg uppercase">Colégio Exemplo - Avaliação</h3>
            <p className="text-sm">Professor: {questao.professor?.name || '____________________'}</p>
          </div>

          <div className="space-y-6 text-base text-black leading-relaxed">
            {/* Numeração e Enunciado */}
            <div className="flex gap-2">
              <span className="font-bold">1.</span>
              <div className="w-full">
                <div 
                  className="prose prose-sm max-w-none text-black"
                  style={{ fontFamily: 'inherit', fontSize: '11pt' }}
                  dangerouslySetInnerHTML={{ __html: questao.enunciado }}
                />

                {questao.imagemUrl && (
                  <div className="my-6 text-center">
                    <img 
                      src={questao.imagemUrl} 
                      alt="Imagem da questão" 
                      className="max-h-80 object-contain mx-auto border border-slate-200 p-1 bg-white"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Alternativas */}
            <div className="pl-6 space-y-3 mt-4" style={{ fontSize: '11pt' }}>
              {['A', 'B', 'C', 'D', 'E'].map((letter) => (
                <div key={letter} className="flex gap-3 relative">
                  {/* Highlight para a resposta correta no preview */}
                  {questao.correta === letter && (
                    <div className="absolute -left-6 top-1 w-3 h-3 bg-slate-300 rounded-full" title="Gabarito" />
                  )}
                  <span className="font-bold shrink-0">{letter.toLowerCase()})</span>
                  <span>{questao[`alternativa${letter}`]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          <div className="flex gap-2">
            <span className="px-2 py-1 bg-slate-200 text-slate-700 text-[10px] font-bold uppercase rounded">
              {questao.tipo === 'RECUPERACAO' ? 'Recuperação' : 'Normal'}
            </span>
            <span className="px-2 py-1 bg-slate-200 text-slate-700 text-[10px] font-bold uppercase rounded">
              {questao.unidade}ª Unidade
            </span>
          </div>
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-colors"
          >
            Fechar Visualização
          </button>
        </div>
      </div>
    </div>
  )
}
