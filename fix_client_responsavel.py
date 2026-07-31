import re

with open('src/app/dashboard/simulados/SimuladosClient.tsx', 'r') as f:
    content = f.read()

# 1. Add responsavelName state
if "const [responsavelName, setResponsavelName]" not in content:
    content = content.replace(
        "const [loadingData, setLoadingData] = useState(false)",
        "const [loadingData, setLoadingData] = useState(false)\n  const [responsavelName, setResponsavelName] = useState<string | null>(null)"
    )

# 2. Extract responsavelName from fetch response
fetch_call = """          setCanLaunch(canEdit && selectedUnidade !== "1") // Congelar digitação da 1ª unidade
          setGabarito(data.gabarito || null)
        } else {"""
new_fetch_call = """          setCanLaunch(canEdit && selectedUnidade !== "1") // Congelar digitação da 1ª unidade
          setGabarito(data.gabarito || null)
          setResponsavelName(data.responsavelName || null)
        } else {"""
content = content.replace(fetch_call, new_fetch_call)

# Reset responsavelName when fetching starts
if "setResponsavelName(null)" not in content:
    content = content.replace(
        "setGabarito(null)",
        "setGabarito(null)\n      setResponsavelName(null)"
    )

# 3. Add UI badge to display the teacher
header_ui = """        <div className="p-4 border-b border-slate-200/60 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <Users size={18} className="text-slate-400" />
            Matriz de Avaliação Somativa
          </div>"""

new_header_ui = """        <div className="p-4 border-b border-slate-200/60 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-slate-700 font-semibold">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-slate-400" />
              Matriz de Avaliação Somativa
            </div>
            {responsavelName && (
              <span className="bg-indigo-100 text-indigo-700 text-xs px-2.5 py-1 rounded-full font-medium border border-indigo-200">
                Lançamento: {responsavelName}
              </span>
            )}
            {!responsavelName && selectedProva && (
              <span className="bg-amber-100 text-amber-700 text-xs px-2.5 py-1 rounded-full font-medium border border-amber-200">
                Nenhum professor designado
              </span>
            )}
          </div>"""
content = content.replace(header_ui, new_header_ui)

with open('src/app/dashboard/simulados/SimuladosClient.tsx', 'w') as f:
    f.write(content)

print("Client updated.")
