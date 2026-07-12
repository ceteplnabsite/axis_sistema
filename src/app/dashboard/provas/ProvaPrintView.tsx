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
            margin: 10mm 15mm; /* Margens mínimas para evitar corte, o conteúdo controla o resto */
          }
          body {
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Esconde tudo no body, exceto o container de impressão */
          body > *:not(.print-container) {
            display: none !important;
          }
          .print-container {
            width: 100%;
            background: white;
            color: black;
          }
          /* Tabelas para repetição de cabeçalho e rodapé */
          table.print-layout {
            width: 100%;
          }
          table.print-layout > thead > tr > td {
            height: 15mm;
          }
          table.print-layout > tfoot > tr > td {
            height: 15mm;
          }
          .page-break-before {
            page-break-before: always;
          }
          .avoid-break {
            page-break-inside: avoid;
          }
          .print-header {
            border-bottom: 1.5px solid black;
          }
        }
      `}} />

      <table className="print-layout w-full">
        <thead className="print:table-header-group">
          <tr>
            <td>
              {/* CABEÇALHO REPETIDO EM TODAS AS PÁGINAS */}
              <div className="w-full text-center text-[8pt] text-gray-500 uppercase tracking-widest pb-4 border-b border-transparent">
                 {titulo} {prova?.codigo ? `• CÓDIGO: #${prova.codigo}` : ''}
              </div>
            </td>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>
              {/* INÍCIO DO CONTEÚDO */}
              {!apenasGabarito && (
                <div className="prova-pages">
                  {/* Cabeçalho principal da primeira página */}
                  <div className="print-header flex items-center justify-between pb-3 mb-4 mt-2 border-b-2 border-black">
                    <img src="/logo-cetep-pdf.png" alt="CETEP Logo" className="w-16 h-16 object-contain" />
                    <div className="flex flex-col items-center flex-1">
                      <h1 className="font-bold text-[15pt] leading-tight text-center" style={{ fontFamily: 'Arial, sans-serif' }}>CENTRO TERRITORIAL DE EDUCAÇÃO PROFISSIONAL</h1>
                      <h2 className="text-[12pt] tracking-wide mt-1 text-center" style={{ fontFamily: 'Arial, sans-serif' }}>LITORAL NORTE E AGRESTE BAIANO - CETEP/LNAB</h2>
                    </div>
                    <div className="w-16"></div> {/* Spacer */}
                  </div>

                  <h2 className="font-bold text-[14pt] text-center mb-4 uppercase" style={{ fontFamily: 'Arial, sans-serif' }}>{titulo}</h2>

                  <div className="w-full flex justify-between items-start mb-4 text-[10pt]" style={{ fontFamily: 'Arial, sans-serif' }}>
                    <div className="flex flex-col gap-3 w-[85%] pr-8">
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

                  <div className="w-full mb-3 text-[10pt]" style={{ fontFamily: 'Arial, sans-serif' }}>
                    <h3 className="font-bold mb-1 text-[11pt]">Orientações para os alunos:</h3>
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

                  {/* GABARITO (Estilo ENEM) na Primeira Página */}
                  <div className="w-full mt-4 mb-8 avoid-break font-sans" style={{ fontFamily: 'Arial, sans-serif' }}>
                    <h3 className="font-bold text-[12pt] mb-2 text-center uppercase border-b-2 border-black pb-1 tracking-widest">GABARITO</h3>
                    <table className="w-full border-collapse border-2 border-black text-center text-[10pt]">
                      <tbody>
                        {Array.from({ length: Math.ceil(totalQuestoes / 10) }).map((_, rowIndex) => (
                          <React.Fragment key={rowIndex}>
                            <tr className="bg-gray-200 font-bold text-[9pt] print:bg-gray-200">
                              {Array.from({ length: 10 }).map((_, colIndex) => {
                                const qNum = rowIndex * 10 + colIndex + 1;
                                return (
                                  <td key={`header-${colIndex}`} className="border border-black py-1 w-[10%]">
                                    {qNum <= totalQuestoes ? String(qNum).padStart(2, '0') : ''}
                                  </td>
                                );
                              })}
                            </tr>
                            <tr>
                              {Array.from({ length: 10 }).map((_, colIndex) => {
                                const qNum = rowIndex * 10 + colIndex + 1;
                                if (qNum > totalQuestoes) {
                                  return <td key={`box-${colIndex}`} className="border border-black h-8 w-[10%]" />;
                                }
                                return (
                                  <td key={`box-${colIndex}`} className="border border-black py-2 px-1 w-[10%] align-middle">
                                     <div className="flex justify-between items-center px-0.5 gap-0.5">
                                        {['A', 'B', 'C', 'D', 'E'].map(l => (
                                          <div key={l} className="w-3 h-3 rounded-full border border-black flex items-center justify-center text-[6px] text-gray-800 font-bold bg-white">
                                            {l}
                                          </div>
                                        ))}
                                     </div>
                                  </td>
                                );
                              })}
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="page-break-before"></div>

                  {/* QUESTÕES */}
                  <div className={`prova-body ${layout === 2 ? 'columns-2 gap-8' : 'flex flex-col gap-6'} w-full block`}>
                    {questoes?.map((q: any, idx: number) => (
                      <div key={idx} className="avoid-break mb-6 break-inside-avoid w-full">
                        <div className="flex gap-2">
                          <span className={`font-bold ${fontSizeClass}`}>{idx + 1}.</span>
                          <div className="w-full min-w-0">
                            <div 
                              lang="pt-BR"
                              className={`prose prose-sm max-w-none text-black break-words overflow-hidden w-full ${fontSizeClass} text-justify hyphens-auto`}
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
                                lang="pt-BR"
                                className="prose prose-sm max-w-none text-black break-words overflow-hidden w-full text-justify hyphens-auto"
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
              {/* FIM DO CONTEÚDO */}
            </td>
          </tr>
        </tbody>

        <tfoot className="print:table-footer-group">
          <tr>
            <td>
              <div className="w-full pt-4 flex justify-between text-[8pt] text-gray-500 font-sans border-t border-transparent mt-4">
                 <span>Gerado pelo sistema em {new Date().toLocaleString('pt-BR')}</span>
                 <span>Página calculada pelo navegador</span>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Gabarito do Professor (se aplicável) foi removido conforme solicitação para usar apenas o estilo ENEM na 1ª página */}

    </div>
  )

  return createPortal(content, document.body)
}
