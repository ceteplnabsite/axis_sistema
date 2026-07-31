import re

with open('src/app/dashboard/simulados/SimuladosClient.tsx', 'r') as f:
    content = f.read()

# 3. Add UI badge to display the teacher
old_header_ui = """               <h2 className="text-lg font-medium text-slate-800 flex items-center gap-2">
                 <Users size={20} className="text-slate-400" />
                 Matriz de Avaliação Somativa
               </h2>"""

new_header_ui = """               <h2 className="text-lg font-medium text-slate-800 flex items-center gap-2">
                 <Users size={20} className="text-slate-400" />
                 Matriz de Avaliação Somativa
               </h2>
               <div className="mt-2">
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

if "Lançamento: {responsavelName}" not in content:
    content = content.replace(old_header_ui, new_header_ui)
    with open('src/app/dashboard/simulados/SimuladosClient.tsx', 'w') as f:
        f.write(content)
    print("Fixed UI replace")
else:
    print("UI already contains responsavelName badge")
