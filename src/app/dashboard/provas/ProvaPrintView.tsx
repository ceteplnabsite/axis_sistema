import React from 'react'

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
  if (!prova) return null

  const { titulo, turma, questoes } = prova
  const { layout = 1, ampliada = false, apenasGabarito = false, comGabarito = true } = options

  const fontSizeClass = ampliada ? 'text-lg' : 'text-[11pt]'
  const titleSizeClass = ampliada ? 'text-2xl' : 'text-lg'
  const headerSizeClass = ampliada ? 'text-sm' : 'text-xs'

  const letras = ['A', 'B', 'C', 'D', 'E']

  // Calcula contagem de questões para o gabarito
  const totalQuestoes = questoes?.length || 0

  return (
    <div className="print-container bg-white text-black font-serif print:p-0 print:m-0" style={{ fontFamily: 'Times New Roman, Times, serif' }}>
      
      {/* Estilos para impressão */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Esconde tudo no body, exceto o elemento com a classe .print-container */
          body > *:not(#print-root) {
            display: none !important;
          }
          #print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
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
            border-bottom: 2px solid black;
            padding-bottom: 15px;
            margin-bottom: 20px;
            text-align: center;
          }
        }
      `}} />

      {!apenasGabarito && (
        <div className="prova-pages">
          <div className="print-header flex flex-col items-center">
            <h1 className={`font-bold uppercase ${titleSizeClass} mb-1`}>CENTRO TERRITORIAL DE EDUCAÇÃO PROFISSIONAL</h1>
            <h2 className={`font-bold uppercase ${titleSizeClass} ${prova.codigo ? 'mb-2' : 'mb-4'}`}>{titulo}</h2>
            
            {prova.codigo && (
              <div className="text-xs font-black border-2 border-black px-4 py-1 mb-4 uppercase tracking-widest print:bg-gray-100">
                Prova Nº {prova.codigo}
              </div>
            )}
            
            <div className={`w-full flex justify-between items-end border border-black p-2 ${headerSizeClass}`}>
              <div className="flex flex-col gap-1 w-2/3">
                <div className="flex gap-2">
                  <span className="font-bold">Aluno(a):</span>
                  <span className="border-b border-black flex-1"></span>
                </div>
                <div className="flex gap-2 mt-2">
                  <span className="font-bold">Turma:</span>
                  <span>{turma?.nome} - {turma?.curso} ({turma?.turno})</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 w-1/3">
                <div className="flex gap-2 w-full">
                  <span className="font-bold">Data:</span>
                  <span className="border-b border-black flex-1 text-center">___/___/20__</span>
                </div>
                <div className="flex gap-2 mt-2 w-full">
                  <span className="font-bold">Nota:</span>
                  <span className="border-b border-black flex-1"></span>
                </div>
              </div>
            </div>
          </div>

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
                        style={{ fontFamily: 'inherit', wordWrap: 'break-word', overflowWrap: 'break-word', lineHeight: '1.5' }}
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
}
