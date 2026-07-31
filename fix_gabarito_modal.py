import re

with open('src/app/dashboard/simulados/SimuladosClient.tsx', 'r') as f:
    content = f.read()

# 1. Ensure state exists
if "const [showGabaritoModal, setShowGabaritoModal] = useState(false)" not in content:
    content = content.replace(
        "const [welcomeModalShown, setWelcomeModalShown] = useState(false)",
        "const [welcomeModalShown, setWelcomeModalShown] = useState(false)\n  const [showGabaritoModal, setShowGabaritoModal] = useState(false)"
    )

# 2. Find the Imprimir button and add Gabarito button next to it
imprimir_btn = """            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              <Printer size={16} />
              Imprimir
            </button>"""

gabarito_btn = """            {gabarito && gabarito.length > 0 && (
              <button
                onClick={() => setShowGabaritoModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-sm font-medium transition-colors print:hidden"
              >
                <Target size={16} />
                Gabarito Oficial
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              <Printer size={16} />
              Imprimir
            </button>"""

content = content.replace(imprimir_btn, gabarito_btn)

# 3. Replace the inline gabarito with a modal wrapping GabaritoProfessor
inline_gabarito = """{/* Gabarito Inline */}
        {gabarito && gabarito.length > 0 && (
          <GabaritoProfessor 
            titulo={provas.find(p => p.id === selectedProva)?.titulo || 'Simulado'}
            questoes={gabarito} 
            maxNota={4.0} 
          />
        )}"""

modal_gabarito = """      {/* Modal do Gabarito Professor */}
      {showGabaritoModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 relative p-4 custom-scrollbar">
            <button 
              onClick={() => setShowGabaritoModal(false)}
              className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors z-10 print:hidden"
            >
              <X size={24} className="text-slate-600" />
            </button>
            
            <div className="print:m-0 print:p-0">
               <GabaritoProfessor 
                  titulo={provas.find(p => p.id === selectedProva)?.titulo || 'Simulado'}
                  questoes={gabarito} 
                  maxNota={4.0} 
                />
            </div>
          </div>
        </div>
      )}"""

# Replace inline gabarito with nothing
content = content.replace(inline_gabarito, "")

# Add modal to the end of the file (before the last `</div>`)
content = content.replace("{/* Modal de Gabarito */}", modal_gabarito)

with open('src/app/dashboard/simulados/SimuladosClient.tsx', 'w') as f:
    f.write(content)

print("Modal implemented")
