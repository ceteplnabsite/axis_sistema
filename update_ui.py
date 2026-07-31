import re

with open('src/app/dashboard/simulados/SimuladosClient.tsx', 'r') as f:
    content = f.read()

# 1. State for Welcome Modal
welcome_state = """  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [welcomeModalShown, setWelcomeModalShown] = useState(false)"""

content = content.replace('  const [showGabaritoModal, setShowGabaritoModal] = useState(false)', '  const [showGabaritoModal, setShowGabaritoModal] = useState(false)\n' + welcome_state)

# 2. Logic to show Welcome Modal
load_logic = """        setCanView(viewPerm)
        setGabarito(gabaritoData)
        
        if (canEdit && selectedUnidade !== "1" && !welcomeModalShown) {
           setShowWelcomeModal(true)
           setWelcomeModalShown(true)
        }"""
content = content.replace("""        setCanView(viewPerm)
        setGabarito(gabaritoData)""", load_logic)


# 3. Add Student Numbering
# In the table headers
table_headers = """                <tr>
                  <th className="px-6 py-4 print:py-2 print:px-2 text-sm print:text-xs font-medium text-slate-400 uppercase tracking-widest border-b print:border-slate-800">Estudante</th>"""
new_table_headers = """                <tr>
                  <th className="px-4 py-4 w-12 text-center text-sm font-medium text-slate-400 uppercase tracking-widest border-b">#</th>
                  <th className="px-6 py-4 print:py-2 print:px-2 text-sm print:text-xs font-medium text-slate-400 uppercase tracking-widest border-b print:border-slate-800">Estudante</th>"""
content = content.replace(table_headers, new_table_headers)

# In the table body
row_start = """                  filteredEstudantes.map((est) => {"""
new_row_start = """                  filteredEstudantes.map((est, index) => {"""
content = content.replace(row_start, new_row_start)

td_start = """                      <tr key={est.matricula} className="hover:bg-slate-50 transition-colors print:border-b print:border-slate-200">
                         <td className="px-6 py-3.5 print:py-1.5 print:px-2">"""
new_td_start = """                      <tr key={est.matricula} className="hover:bg-slate-50 transition-colors print:border-b print:border-slate-200">
                         <td className="px-4 py-3.5 text-center text-sm font-bold text-slate-400">{index + 1}</td>
                         <td className="px-6 py-3.5 print:py-1.5 print:px-2">"""
content = content.replace(td_start, new_td_start)

content = content.replace('colSpan={5}', 'colSpan={6}')


# 4. Render Gabarito Inline if gabarito exists
inline_gabarito = """
        {/* Gabarito Inline */}
        {gabarito && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-300 overflow-hidden print:hidden mt-6 mb-6">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
              <Target size={20} className="text-indigo-500"/>
              <h3 className="text-lg font-medium text-slate-800 uppercase tracking-tight">Gabarito Oficial</h3>
            </div>
            <div className="p-6 overflow-x-auto custom-scrollbar">
               <div className="flex gap-4 pb-2">
                 {gabarito.map((q: any) => (
                   <div key={q.numero} className="flex flex-col items-center justify-center min-w-[3.5rem] bg-slate-50 border border-slate-200 rounded-xl p-2">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Q{q.numero}</span>
                     <span className="text-lg font-black text-emerald-600 leading-none">{q.correta}</span>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        )}
"""

# Place it right above the Lançamento table
content = content.replace('{/* Lançamento Estilo Resultados */}', inline_gabarito + '\n        {/* Lançamento Estilo Resultados */}')


# 5. Add Welcome Modal HTML
welcome_modal = """
      {/* Modal de Boas Vindas */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 text-center">
            <div className="p-8 pt-10">
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-indigo-100">
                 <CheckCircle2 size={40} />
              </div>
              <h3 className="text-2xl font-medium text-slate-800 tracking-tight mb-2">Área de Lançamento</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Você foi designado(a) como <strong>Responsável</strong> pela correção e lançamento das notas do Simulado desta turma na {selectedUnidade}ª Unidade.
              </p>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setShowWelcomeModal(false)}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-xl shadow-indigo-200 active:scale-95"
              >
                Ciente, iniciar lançamentos
              </button>
            </div>
          </div>
        </div>
      )}
"""

content = content.replace('{/* Modal de Gabarito */}', welcome_modal + '\n      {/* Modal de Gabarito */}')

with open('src/app/dashboard/simulados/SimuladosClient.tsx', 'w') as f:
    f.write(content)

print("Modifications applied successfully.")
