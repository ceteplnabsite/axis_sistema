import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface ProvaPrintViewProps {
  prova: any;
  options: {
    layout?: 1 | 2;
    ampliada?: boolean;
    apenasGabarito?: boolean;
    comGabarito?: boolean;
  }
}

export default function ProvaPrintView({ prova, options }: ProvaPrintViewProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!prova || !mounted) return null

  const { titulo, turma, questoes } = prova
  const { layout = 1, ampliada = false, apenasGabarito = false, comGabarito = true } = options

  const fontSizeClass = ampliada ? 'text-lg' : 'text-[11pt]'
  const titleSizeClass = ampliada ? 'text-2xl' : 'text-lg'
  const headerSizeClass = ampliada ? 'text-sm' : 'text-xs'

  const letras = ['A', 'B', 'C', 'D', 'E']

  // Calcula contagem de questões para o gabarito
  const totalQuestoes = questoes?.length || 0

  const content = (
    <div className="print-container bg-white text-black font-serif print:p-0 print:m-0" style={{ fontFamily: 'Times New Roman, Times, serif' }}>
      
      {/* Estilos para impressão */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Esconde tudo no body, exceto o container de impressão */
          body > *:not(.print-container) {
            display: none !important;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 15mm 15mm 20mm 15mm;
            background: white;
            z-index: 99999;
          }
          .page-break-before {
            page-break-before: always;
          }
          .avoid-break {
            page-break-inside: avoid;
          }
          .print-header {
            border-bottom: 1.5px solid black;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
        }
      `}} />

      {!apenasGabarito && (
        <div className="prova-pages">
          <div className="print-header flex items-center justify-between pb-4 border-b-[1.5px] border-black mb-6 mt-4">
            <img src="/logo-cetep-pdf.png" alt="CETEP Logo" className="w-16 h-16 object-contain" />
            <div className="flex flex-col items-center flex-1">
              <h1 className="font-bold text-[15pt] leading-tight text-center" style={{ fontFamily: 'Arial, sans-serif' }}>CENTRO TERRITORIAL DE EDUCAÇÃO PROFISSIONAL</h1>
              <h2 className="text-[12pt] tracking-wide mt-1 text-center" style={{ fontFamily: 'Arial, sans-serif' }}>LITORAL NORTE E AGRESTE BAIANO - CETEP/LNAB</h2>
            </div>
            <div className="w-16"></div> {/* Spacer */}
          </div>

          <h2 className="font-bold text-[14pt] text-center mb-8" style={{ fontFamily: 'Arial, sans-serif' }}>{titulo}</h2>

          <div className="w-full flex justify-between items-start mb-8 text-[10pt]" style={{ fontFamily: 'Arial, sans-serif' }}>
            <div className="flex flex-col gap-4 w-[85%] pr-8">
              <div className="flex gap-2 items-end">
                <span className="font-bold whitespace-nowrap text-[10pt]">ESTUDANTE:</span>
                <span className="border-b border-black flex-1 mb-1"></span>
              </div>
              <div className="flex justify-between items-end">
                <div className="flex gap-2 items-end">
                  <span className="font-bold text-[10pt]">CURSO:</span>
                  <span className="uppercase text-[9pt]">{turma?.curso || '___________________________'}</span>
                </div>
                <div className="font-bold text-[10pt] tracking-widest">{turma?.nome}</div>
                <div className="flex gap-1 items-end">
                  <span className="font-bold text-[10pt]">DATA:</span>
                  <span className="font-bold text-[10pt]">___/___/2026</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col border border-black w-24 shrink-0 h-16">
              <div className="border-b border-black text-center font-bold text-[9px] py-1">NOTA</div>
              <div className="flex-1"></div>
            </div>
          </div>

          <div className="w-full mb-8 text-[10pt]" style={{ fontFamily: 'Arial, sans-serif' }}>
            <h3 className="font-bold mb-2 text-[11pt]">Orientações para os alunos:</h3>
            <ul className="list-none pl-2 space-y-1.5 text-[9.5pt]">
              <li>• Leia a avaliação com atenção e revise-a ao finalizar.</li>
              <li>• Todas as questões objetivas têm apenas uma resposta correta.</li>
              <li>• Preencha o cartão de respostas com caneta preta ou azul. Não utilize lápis ou corretivo. Rasuras invalidam a questão.</li>
              <li>• É estritamente proibida a consulta a materiais não autorizados ou a comunicação entre alunos.</li>
              <li>• O uso de dispositivos eletrônicos (como celular, calculadoras ou smartwatches) resultará na anulação da prova.</li>
              <li>• A avaliação terá duração de 1 hora e 30 minutos.</li>
              <li>• Tempo mínimo de permanência em sala: 30 minutos.</li>
            </ul>
          </div>

          {/* GABARITO (Cartão Resposta) */}
          <div className="w-full mt-10 mb-12 avoid-break font-sans" style={{ fontFamily: 'Arial, sans-serif' }}>
            <h3 className="font-bold text-[14pt] mb-6 uppercase tracking-wide">GABARITO</h3>
            <div className="flex justify-center w-full">
              <div className="border border-black p-6 inline-block bg-white">
                <table className="border-collapse">
                  <tbody>
                    {Array.from({ length: totalQuestoes }).map((_, i) => (
                      <tr key={i}>
                        <td className="font-bold text-[11pt] px-4 py-1 text-right align-middle">{String(i + 1).padStart(2, '0')}</td>
                        {['A', 'B', 'C', 'D', 'E'].map(letter => (
                          <td key={letter} className="px-1.5 py-1 align-middle">
                            <div className="w-6 h-6 rounded-full border border-black flex items-center justify-center text-[9px] text-gray-700">
                              {letter}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Quebra de página antes de iniciar as questões caso deseje (opcional, vou deixar contínuo mas o user pediu o layout do gabarito em cima) */}
          <div className="page-break-before"></div>

          <div className={`prova-body ${layout === 2 ? 'columns-2 gap-8' : 'flex flex-col gap-6'}`}>
            {questoes?.map((q: any, idx: number) => (
              <div key={idx} className="avoid-break mb-6 break-inside-avoid w-full">
                <div className="flex gap-2">
                  <span className={`font-bold ${fontSizeClass}`}>{idx + 1}.</span>
                  <div className="w-full min-w-0">
                    <div 
                      className={`prose prose-sm max-w-none text-black break-words overflow-hidden w-full ${fontSizeClass}`}
                      style={{ fontFamily: 'inherit', wordWrap: 'break-word', overflowWrap: 'break-word', lineHeight: '1.5' }}
                      dangerouslySetInnerHTML={{ __html: q.enunciado }}
                    />
                    {q.imagemUrl && (
                      <div className="my-4 text-center">
                        <img 
                          src={q.imagemUrl} 
                          alt="Imagem da questão" 
                          className="max-h-[250px] object-contain mx-auto border border-gray-200"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className={`pl-6 mt-3 space-y-2 ${fontSizeClass}`}>
                  {letras.map((letter) => (
                    <div key={letter} className="flex gap-3 relative">
                      <span className="font-bold shrink-0">{letter.toLowerCase()})</span>
                      <div 
                        className="prose prose-sm max-w-none text-black break-words overflow-hidden w-full"
                        style={{ fontFamily: 'inherit', wordWrap: 'break-word', overflowWrap: 'break-word', lineHeight: '1.4', marginTop: '-2px' }}
                        dangerouslySetInnerHTML={{ __html: q[`alternativa${letter}`] }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Fixo (Substitui o padrão do navegador) */}
      <div className="fixed bottom-0 left-0 w-full text-center text-[8pt] text-gray-500 hidden print:block bg-white pb-3 pt-1 z-50" style={{ fontFamily: 'Arial, sans-serif' }}>
        {titulo} {prova?.codigo ? `• CÓDIGO DA PROVA: ${prova.codigo}` : ''}
      </div>

      {(comGabarito || apenasGabarito) && (
        <div className={`gabarito-page ${!apenasGabarito ? 'page-break-before mt-8' : ''}`}>
          <div className="print-header flex flex-col items-center">
            <h1 className={`font-bold uppercase ${titleSizeClass} mb-1`}>CENTRO TERRITORIAL DE EDUCAÇÃO PROFISSIONAL</h1>
            <h2 className={`font-bold uppercase ${titleSizeClass} ${prova.codigo ? 'mb-2' : 'mb-4'}`}>GABARITO: {titulo}</h2>
            
            {prova.codigo && (
              <div className="text-xs font-black border-2 border-black px-4 py-1 mb-4 uppercase tracking-widest print:bg-gray-100">
                Prova Nº {prova.codigo}
              </div>
            )}
            <div className={`w-full flex justify-between items-center border border-black p-2 ${headerSizeClass}`}>
              <div className="flex gap-2">
                <span className="font-bold">Turma:</span>
                <span>{turma?.nome}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center mt-8">
            <h3 className="font-bold mb-4 text-xl">Cartão Resposta</h3>
            
            <div className="border border-black flex">
              <div className="flex flex-col">
                 {/* Header Row */}
                 <div className="flex border-b border-black bg-gray-100 print:bg-gray-100">
                   <div className="w-12 h-10 border-r border-black flex items-center justify-center font-bold">Nº</div>
                   {letras.map(l => (
                     <div key={l} className="w-10 h-10 border-r border-black flex items-center justify-center font-bold last:border-r-0">{l}</div>
                   ))}
                 </div>
                 
                 {/* Questions Rows */}
                 {questoes?.map((q: any, idx: number) => (
                   <div key={idx} className="flex border-b border-black last:border-b-0">
                     <div className="w-12 h-10 border-r border-black flex items-center justify-center font-bold bg-gray-50 print:bg-gray-50">{idx + 1}</div>
                     {letras.map(l => (
                       <div key={l} className="w-10 h-10 border-r border-black flex items-center justify-center last:border-r-0">
                         {q.correta === l && (
                           <div className="w-6 h-6 bg-black rounded-full print:bg-black"></div>
                         )}
                       </div>
                     ))}
                   </div>
                 ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )

  return createPortal(content, document.body)
}
