import re
import sys

with open('src/app/dashboard/simulados/SimuladosClient.tsx', 'r') as f:
    content = f.read()

# 1. Interfaces
content = content.replace(
    'areas: Area[], \n  user: any \n}) {',
    'provas: {id: string, titulo: string, codigo: number, turmaId: string | null}[], \n  user: any \n}) {'
)
content = content.replace(
    '  areas, \n  user \n}: { \n  turmas: Turma[], \n  areas: Area[], ',
    '  provas, \n  user \n}: { \n  turmas: Turma[], \n  provas: {id: string, titulo: string, codigo: number, turmaId: string | null}[], '
)
content = content.replace(
    '    nota: number\n    unidade: number\n    updatedAt?: string',
    '    nota: number | null\n    ausente?: boolean\n    notaSegundaChamada?: number | null\n    unidade: number\n    updatedAt?: string'
)

# 2. State
state_decl = """  const [selectedTurma, setSelectedTurma] = useState("")
  const [selectedProva, setSelectedProva] = useState("")
  const [selectedUnidade, setSelectedUnidade] = useState("1")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [estudantes, setEstudantes] = useState<Estudante[]>([])
  const [notasTemp, setNotasTemp] = useState<Record<string, string>>({})
  const [originalNotas, setOriginalNotas] = useState<Record<string, string>>({})
  const [ausentesTemp, setAusentesTemp] = useState<Record<string, boolean>>({})
  const [originalAusentes, setOriginalAusentes] = useState<Record<string, boolean>>({})
  const [notaSegundaChamadaTemp, setNotaSegundaChamadaTemp] = useState<Record<string, string>>({})
  const [originalNotaSegundaChamada, setOriginalNotaSegundaChamada] = useState<Record<string, string>>({})
  const [showModal, setShowModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [canLaunch, setCanLaunch] = useState(false)
  const [canView, setCanView] = useState(false)
  const [gabarito, setGabarito] = useState<any>(null)
  const [showGabaritoModal, setShowGabaritoModal] = useState(false)
  const [launchInfo, setLaunchInfo] = useState<{ author: string, date: string } | null>(null)"""

content = re.sub(
    r'  const \[selectedTurma.*?setLaunchInfo.*?null\)\n',
    state_decl + '\n',
    content,
    flags=re.DOTALL
)

# 3. useEffect
content = content.replace(
    'if (selectedTurma && selectedArea && selectedUnidade) {',
    'if (selectedTurma && selectedProva && selectedUnidade) {'
)
content = content.replace(
    '[selectedTurma, selectedArea, selectedUnidade]',
    '[selectedTurma, selectedProva, selectedUnidade]'
)

# 4. loadEstudantes
load_est = """      const res = await fetch(`/api/simulados?turmaId=${selectedTurma}&provaId=${selectedProva}&unidade=${selectedUnidade}`, { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) {
        const { estudantes: list, canEdit, canView: viewPerm, gabarito: gabaritoData } = data
        setEstudantes(list)
        setCanLaunch(canEdit)
        setCanView(viewPerm)
        setGabarito(gabaritoData)

        const initialNotas: Record<string, string> = {}
        const initialAusentes: Record<string, boolean> = {}
        const initialSegundaChamada: Record<string, string> = {}
        
        let lastUpdateInfo: { author: string, date: string } | null = null

        list.forEach((est: Estudante) => {
          if (est.notasSimulado.length > 0) {
            const nota = est.notasSimulado[0]
            initialNotas[est.matricula] = nota.nota !== null ? nota.nota.toString() : ""
            initialAusentes[est.matricula] = nota.ausente || false
            initialSegundaChamada[est.matricula] = nota.notaSegundaChamada !== null ? nota.notaSegundaChamada.toString() : ""
            
            if (!lastUpdateInfo && nota.updatedAt && nota.lancadoBy) {
               lastUpdateInfo = {
                 author: nota.lancadoBy.name || nota.lancadoBy.email,
                 date: new Date(nota.updatedAt).toLocaleString('pt-BR')
               }
            }
          } else {
            initialNotas[est.matricula] = ""
            initialAusentes[est.matricula] = false
            initialSegundaChamada[est.matricula] = ""
          }
        })
        
        setNotasTemp(initialNotas)
        setOriginalNotas(initialNotas)
        setAusentesTemp(initialAusentes)
        setOriginalAusentes(initialAusentes)
        setNotaSegundaChamadaTemp(initialSegundaChamada)
        setOriginalNotaSegundaChamada(initialSegundaChamada)
        setLaunchInfo(lastUpdateInfo)"""

content = re.sub(
    r'      const res = await fetch.*?setLaunchInfo\(lastUpdateInfo\)',
    load_est,
    content,
    flags=re.DOTALL
)

# 5. handleNotaChange & handleSave
content = content.replace(
    '  const hasUnsavedChanges = () => {',
    '''  const handleAusenteChange = (matricula: string, checked: boolean) => {
    setAusentesTemp(prev => ({ ...prev, [matricula]: checked }))
    if (checked) {
      setNotasTemp(prev => ({ ...prev, [matricula]: "" }))
    }
  }

  const handleSegundaChamadaChange = (matricula: string, value: string) => {
    const val = value.replace(',', '.')
    if (val === "" || (/^\\d*\\.?\\d*$/.test(val) && parseFloat(val) <= 10)) {
      setNotaSegundaChamadaTemp(prev => ({ ...prev, [matricula]: val }))
    }
  }

  const hasUnsavedChanges = () => {'''
)

unsaved_logic = """  const hasUnsavedChanges = () => {
    for (const matricula of Object.keys(notasTemp)) {
      if (
        notasTemp[matricula] !== originalNotas[matricula] ||
        ausentesTemp[matricula] !== originalAusentes[matricula] ||
        notaSegundaChamadaTemp[matricula] !== originalNotaSegundaChamada[matricula]
      ) {
        return true
      }
    }
    return false
  }"""
content = re.sub(r'  const hasUnsavedChanges = \(\) => \{.*?return false\n  \}', unsaved_logic, content, flags=re.DOTALL)

notas_to_save = """    const notasToSave = Object.entries(notasTemp)
      .filter(([matricula]) => 
        notasTemp[matricula] !== originalNotas[matricula] || 
        ausentesTemp[matricula] !== originalAusentes[matricula] || 
        notaSegundaChamadaTemp[matricula] !== originalNotaSegundaChamada[matricula]
      )
      .map(([matricula]) => ({
        estudanteId: matricula,
        nota: notasTemp[matricula] === "" ? null : parseFloat(notasTemp[matricula]),
        ausente: ausentesTemp[matricula] || false,
        notaSegundaChamada: notaSegundaChamadaTemp[matricula] === "" ? null : parseFloat(notaSegundaChamadaTemp[matricula])
      }))"""
content = re.sub(r'    const notasToSave = Object\.entries\(notasTemp\).*?\.filter\(n => n\.nota === null \|\| !isNaN\(n\.nota\)\)', notas_to_save, content, flags=re.DOTALL)

content = content.replace(
    'areaId: selectedArea,',
    'provaId: selectedProva,'
)
content = content.replace(
    'setOriginalNotas({...notasTemp})',
    'setOriginalNotas({...notasTemp})\n        setOriginalAusentes({...ausentesTemp})\n        setOriginalNotaSegundaChamada({...notaSegundaChamadaTemp})'
)

# 6. View updates (Dropdown and Tabs)
content = content.replace(
    '''            <div className="flex-1 min-w-[200px] space-y-2">
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] ml-2">Área de Conhecimento</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 group-focus-within:text-rose-600 group-focus-within:bg-rose-50 transition-all">
                    <BookOpen size={16} />
                  </div>
                  <select
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-200 border-none rounded-2xl pl-14 pr-6 py-4 text-sm focus:ring-2 focus:ring-rose-500 transition-all appearance-none cursor-pointer font-medium text-slate-700 shadow-inner"
                  >
                    <option value="">Selecione a Área...</option>
                    {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </div>
            </div>''',
    '''            <div className="flex-1 min-w-[200px] space-y-2">
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] ml-2">Prova</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 group-focus-within:text-rose-600 group-focus-within:bg-rose-50 transition-all">
                    <FileText size={16} />
                  </div>
                  <select
                    value={selectedProva}
                    onChange={(e) => setSelectedProva(e.target.value)}
                    disabled={!selectedTurma}
                    className="w-full bg-slate-50 hover:bg-slate-200 border-none rounded-2xl pl-14 pr-6 py-4 text-sm focus:ring-2 focus:ring-rose-500 transition-all appearance-none cursor-pointer font-medium text-slate-700 shadow-inner"
                  >
                    <option value="">Selecione a Prova...</option>
                    {provas.filter(p => p.turmaId === selectedTurma || !p.turmaId).map((p) => <option key={p.id} value={p.id}>#{p.codigo} - {p.titulo}</option>)}
                  </select>
                </div>
            </div>'''
)

tabs_html = """            <div className="flex-1 min-w-[200px] space-y-2">
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] ml-2">Unidade / Etapa</label>
                <div className="flex bg-slate-50 p-1.5 rounded-2xl shadow-inner border border-slate-100">
                  <button
                    onClick={() => setSelectedUnidade("1")}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all ${
                      selectedUnidade === "1" ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                  >
                    1ª Unidade
                  </button>
                  <button
                    onClick={() => setSelectedUnidade("2")}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all ${
                      selectedUnidade === "2" ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                  >
                    2ª Unidade
                  </button>
                </div>
            </div>"""

content = re.sub(
    r'<div className="flex-1 min-w-\[200px\] space-y-2">\s*<label className="text-\[10px\] font-medium text-slate-400 uppercase tracking-\[0\.2em\] ml-2">Unidade / Etapa</label>.*?</div>\s*</div>',
    tabs_html,
    content,
    flags=re.DOTALL
)

# 7. Add Gabarito button and logic
header_actions = """             <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative max-w-xs w-full">"""
content = content.replace(
    header_actions,
    """             <div className="flex items-center gap-3 w-full md:w-auto">
              {gabarito && (
                <button
                  onClick={() => setShowGabaritoModal(true)}
                  className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm border border-indigo-200"
                >
                  <Target size={16} />
                  <span className="hidden sm:inline">Gabarito</span>
                </button>
              )}
              <div className="relative max-w-xs w-full">"""
)

# 8. Modals
gabarito_modal = """
      {/* Modal de Gabarito */}
      {showGabaritoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-medium text-slate-800 flex items-center gap-2">
                <Target size={20} className="text-indigo-500"/>
                Gabarito da Prova
              </h3>
              <button onClick={() => setShowGabaritoModal(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-all"><X size={20}/></button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3 custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-300">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-widest border-b">Q.</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-widest border-b">Disciplina</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-widest border-b text-center">Correta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gabarito?.map((q: any) => (
                    <tr key={q.numero} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-bold text-slate-700">{q.numero}</td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">{q.disciplina}</td>
                      <td className="px-4 py-3 text-sm font-black text-emerald-600 text-center">{q.correta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
"""
content = content.replace('{/* Modal para Estudante Faltando */}', gabarito_modal + '\n      {/* Modal para Estudante Faltando */}')

# 9. Update Table columns
table_headers = """                <tr>
                  <th className="px-6 py-4 print:py-2 print:px-2 text-sm print:text-xs font-medium text-slate-400 uppercase tracking-widest border-b print:border-slate-800">Estudante</th>
                  <th className="px-6 py-4 print:py-2 print:px-2 text-sm print:text-xs font-medium text-slate-400 uppercase tracking-widest w-40 text-center border-b print:border-slate-800">Pontuação</th>
                  <th className="px-6 py-4 print:py-2 print:px-2 text-sm print:text-xs font-medium text-slate-400 uppercase tracking-widest text-center border-b print:border-slate-800">Status</th>
                </tr>"""
new_table_headers = """                <tr>
                  <th className="px-6 py-4 print:py-2 print:px-2 text-sm print:text-xs font-medium text-slate-400 uppercase tracking-widest border-b print:border-slate-800">Estudante</th>
                  <th className="px-2 py-4 print:py-2 print:px-2 text-sm print:text-xs font-medium text-slate-400 uppercase tracking-widest w-24 text-center border-b print:border-slate-800">Falta</th>
                  <th className="px-4 py-4 print:py-2 print:px-2 text-sm print:text-xs font-medium text-slate-400 uppercase tracking-widest w-32 text-center border-b print:border-slate-800">Nota</th>
                  <th className="px-4 py-4 print:py-2 print:px-2 text-sm print:text-xs font-medium text-slate-400 uppercase tracking-widest w-32 text-center border-b print:border-slate-800">2ª Chamada</th>
                  <th className="px-6 py-4 print:py-2 print:px-2 text-sm print:text-xs font-medium text-slate-400 uppercase tracking-widest text-center border-b print:border-slate-800">Status</th>
                </tr>"""
content = content.replace(table_headers, new_table_headers)

# 10. Update Table Row
row_logic = """                  filteredEstudantes.map((est) => {
                    const notaNum = parseFloat(notasTemp[est.matricula])
                    const isFalta = notaNum === -1
                    const isAltaPerformance = !isFalta && notaNum > 3.5
                    const isNaMedia = !isFalta && notaNum >= 2.4 && notaNum <= 3.5
                    const hasNota = notasTemp[est.matricula] !== ""

                    return (
                      <tr key={est.matricula} className="hover:bg-slate-50 transition-colors print:border-b print:border-slate-200">
                         <td className="px-6 py-3.5 print:py-1.5 print:px-2">
                           <div className="flex flex-col">
                             <span className="text-base print:text-sm font-medium text-slate-700 print:text-slate-900 uppercase">{est.nome}</span>
                             <span className="text-[11px] print:text-[9px] font-medium text-slate-400 tracking-widest uppercase">Matrícula: {est.matricula}</span>
                           </div>
                         </td>
                        <td className="px-6 py-3.5 print:py-1.5 print:px-2">
                          <div className="flex justify-center items-center gap-2">
                            <div className="relative group">
                              <input
                                type="text"
                                value={notasTemp[est.matricula] === "-1" ? "F" : notasTemp[est.matricula]}
                                onChange={(e) => handleNotaChange(est.matricula, e.target.value)}
                                disabled={!canLaunch}
                                 className={`w-20 text-center py-2 print:py-0 print:w-full border-2 print:border-0 rounded-xl print:rounded-none text-base print:text-sm font-medium outline-none transition-all ${
                                   hasUnsavedChanges() && notasTemp[est.matricula] !== originalNotas[est.matricula] ? 'border-slate-400 bg-white ring-4 ring-slate-500/5' :
                                    !hasNota ? 'border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-400 print:bg-transparent print:text-slate-400' : 
                                    isFalta ? 'border-orange-100 bg-orange-50 text-orange-700 focus:border-orange-400 print:bg-transparent print:text-slate-900' :
                                    isAltaPerformance ? 'border-emerald-100 bg-emerald-50 text-emerald-700 focus:border-emerald-400 print:bg-transparent print:text-slate-900' : 
                                    isNaMedia ? 'border-slate-200 bg-slate-100 text-slate-800 focus:border-blue-400 print:bg-transparent print:text-slate-900' :
                                    'border-red-100 bg-red-50 text-red-700 focus:border-red-400 print:bg-transparent print:text-slate-900'
                                  }`}
                                placeholder="0.0"
                              />
                              <div className="absolute -top-1 -right-1 group-focus-within:block hidden">
                                <div className="w-2 h-2 bg-slate-500 rounded-full animate-ping" />
                              </div>
                            </div>
                            {hasNota && canLaunch && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNotaChange(est.matricula, "");
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors print:hidden"
                                title="Redigitar nota (Limpar)"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3.5 print:py-1.5 print:px-2 text-center">
                          {hasNota ? (
                            <span className={`inline-flex px-3 py-1 print:px-0 print:py-0 rounded-full print:rounded-none text-[10px] print:text-[10px] font-black uppercase tracking-widest border print:border-none shadow-sm print:shadow-none print:bg-transparent print:text-slate-700 ${
                              isFalta ? 'bg-orange-100 text-orange-700 border-orange-200' :
                              isAltaPerformance ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                              isNaMedia ? 'bg-slate-200 text-slate-800 border-slate-300' :
                              'bg-red-100 text-red-700 border-red-200'
                            }`}>
                              {isFalta ? 'Faltou' : isAltaPerformance ? 'Alta Performance' : isNaMedia ? 'Na Média' : 'Abaixo da Média'}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-[10px] font-medium uppercase tracking-widest italic opacity-50">Não Lançado</span>
                          )}
                        </td>
                      </tr>
                    )
                  })"""

new_row_logic = """                  filteredEstudantes.map((est) => {
                    const isFalta = ausentesTemp[est.matricula] || false
                    const notaNum = isFalta ? -1 : parseFloat(notasTemp[est.matricula])
                    const nota2 = notaSegundaChamadaTemp[est.matricula] ? parseFloat(notaSegundaChamadaTemp[est.matricula]) : -1
                    
                    // A nota final considerada para status será a 2a chamada se existir e for maior que 0 (ou só se existir)
                    const notaEfetiva = nota2 >= 0 ? nota2 : notaNum
                    
                    const isAltaPerformance = notaEfetiva > 3.5
                    const isNaMedia = notaEfetiva >= 2.4 && notaEfetiva <= 3.5
                    const hasNota = notasTemp[est.matricula] !== "" || isFalta
                    
                    const notaUnsaved = notasTemp[est.matricula] !== originalNotas[est.matricula]
                    const ausenteUnsaved = ausentesTemp[est.matricula] !== originalAusentes[est.matricula]
                    const segundaChamadaUnsaved = notaSegundaChamadaTemp[est.matricula] !== originalNotaSegundaChamada[est.matricula]

                    return (
                      <tr key={est.matricula} className="hover:bg-slate-50 transition-colors print:border-b print:border-slate-200">
                         <td className="px-6 py-3.5 print:py-1.5 print:px-2">
                           <div className="flex flex-col">
                             <span className="text-base print:text-sm font-medium text-slate-700 print:text-slate-900 uppercase">{est.nome}</span>
                             <span className="text-[11px] print:text-[9px] font-medium text-slate-400 tracking-widest uppercase">Matrícula: {est.matricula}</span>
                           </div>
                         </td>
                         <td className="px-2 py-3.5 text-center">
                            <label className="flex items-center justify-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={isFalta} 
                                onChange={(e) => handleAusenteChange(est.matricula, e.target.checked)}
                                disabled={!canLaunch}
                                className={`w-5 h-5 rounded-md border-2 border-slate-300 text-orange-500 focus:ring-orange-500 ${ausenteUnsaved ? 'ring-4 ring-orange-500/20' : ''}`}
                              />
                            </label>
                         </td>
                        <td className="px-4 py-3.5 print:py-1.5 print:px-2 text-center">
                          <div className="flex justify-center items-center gap-2">
                            <input
                              type="text"
                              value={notasTemp[est.matricula]}
                              onChange={(e) => handleNotaChange(est.matricula, e.target.value)}
                              disabled={!canLaunch || isFalta}
                               className={`w-20 text-center py-2 print:py-0 print:w-full border-2 print:border-0 rounded-xl print:rounded-none text-base print:text-sm font-medium outline-none transition-all ${
                                 isFalta ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' :
                                 notaUnsaved ? 'border-slate-400 bg-white ring-4 ring-slate-500/5' :
                                 !hasNota ? 'border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-400' :
                                 'border-slate-200 bg-slate-50 focus:border-slate-400'
                               }`}
                              placeholder="0.0"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3.5 print:py-1.5 print:px-2 text-center">
                          {isFalta ? (
                             <div className="flex justify-center items-center gap-2">
                               <input
                                 type="text"
                                 value={notaSegundaChamadaTemp[est.matricula] || ""}
                                 onChange={(e) => handleSegundaChamadaChange(est.matricula, e.target.value)}
                                 disabled={!canLaunch}
                                 className={`w-20 text-center py-2 print:py-0 print:w-full border-2 print:border-0 rounded-xl print:rounded-none text-base print:text-sm font-medium outline-none transition-all ${
                                    segundaChamadaUnsaved ? 'border-slate-400 bg-white ring-4 ring-slate-500/5' :
                                    !notaSegundaChamadaTemp[est.matricula] ? 'border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-400' :
                                    'border-slate-200 bg-white text-slate-800 focus:border-slate-400'
                                 }`}
                                 placeholder="0.0"
                               />
                             </div>
                          ) : (
                             <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 print:py-1.5 print:px-2 text-center">
                          {hasNota ? (
                            <span className={`inline-flex px-3 py-1 print:px-0 print:py-0 rounded-full print:rounded-none text-[10px] print:text-[10px] font-black uppercase tracking-widest border print:border-none shadow-sm print:shadow-none print:bg-transparent print:text-slate-700 ${
                              isFalta && nota2 < 0 ? 'bg-orange-100 text-orange-700 border-orange-200' :
                              isAltaPerformance ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                              isNaMedia ? 'bg-slate-200 text-slate-800 border-slate-300' :
                              'bg-red-100 text-red-700 border-red-200'
                            }`}>
                              {isFalta && nota2 < 0 ? 'Faltou' : isAltaPerformance ? 'Alta Performance' : isNaMedia ? 'Na Média' : 'Abaixo da Média'}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-[10px] font-medium uppercase tracking-widest italic opacity-50">Não Lançado</span>
                          )}
                        </td>
                      </tr>
                    )
                  })"""

content = content.replace(row_logic, new_row_logic)

content = content.replace(
    'colSpan={3} className="px-6 py-16',
    'colSpan={5} className="px-6 py-16'
)

with open('src/app/dashboard/simulados/SimuladosClient.tsx', 'w') as f:
    f.write(content)

print("Modification complete.")
