import os
import re

# 1. Update simulados/page.tsx
page_path = 'src/app/dashboard/simulados/page.tsx'
with open(page_path, 'r') as f:
    page_content = f.read()

page_content = page_content.replace(
    'select: { id: true, titulo: true, codigo: true, turmaId: true },',
    'select: { id: true, titulo: true, codigo: true, turmaId: true, createdAt: true },'
)

with open(page_path, 'w') as f:
    f.write(page_content)

# 2. Update responsaveis/page.tsx
resp_page_path = 'src/app/dashboard/simulados/responsaveis/page.tsx'
with open(resp_page_path, 'r') as f:
    resp_page = f.read()

resp_page = resp_page.replace(
    'select: { id: true, titulo: true, codigo: true, turmaId: true },',
    'select: { id: true, titulo: true, codigo: true, turmaId: true, createdAt: true },'
)

with open(resp_page_path, 'w') as f:
    f.write(resp_page)

# 3. Update SimuladosClient.tsx
client_path = 'src/app/dashboard/simulados/SimuladosClient.tsx'
with open(client_path, 'r') as f:
    client = f.read()

# Update interface
client = client.replace(
    'provas: {id: string, titulo: string, codigo: number, turmaId: string | null}[],',
    'provas: {id: string, titulo: string, codigo: number, turmaId: string | null, createdAt: Date}[],'
)

# Update dropdown filter
old_dropdown = """                  <select
                    value={selectedProva}
                    onChange={(e) => setSelectedProva(e.target.value)}
                    disabled={!selectedTurma}
                    className="w-full bg-slate-50 hover:bg-slate-200 border-none rounded-2xl pl-14 pr-6 py-4 text-sm focus:ring-2 focus:ring-rose-500 transition-all appearance-none cursor-pointer font-medium text-slate-700 shadow-inner"
                  >
                    <option value="">Selecione a Prova...</option>
                    {provas.filter(p => p.turmaId === selectedTurma || !p.turmaId).map((p) => <option key={p.id} value={p.id}>#{p.codigo} - {p.titulo}</option>)}
                  </select>"""

new_dropdown = """                  <select
                    value={selectedProva}
                    onChange={(e) => setSelectedProva(e.target.value)}
                    disabled={!selectedTurma}
                    className="w-full bg-slate-50 hover:bg-slate-200 border-none rounded-2xl pl-14 pr-6 py-4 text-sm focus:ring-2 focus:ring-rose-500 transition-all appearance-none cursor-pointer font-medium text-slate-700 shadow-inner"
                  >
                    <option value="">Selecione a Prova...</option>
                    {provas.filter(p => {
                       if (p.turmaId && p.turmaId !== selectedTurma) return false;
                       // Filtro de data: limite = 30 de julho de 2026
                       const isOld = new Date(p.createdAt) < new Date("2026-07-29T00:00:00Z");
                       if (selectedUnidade === "1") return isOld;
                       if (selectedUnidade === "2") return !isOld;
                       return true;
                    }).map((p) => <option key={p.id} value={p.id}>#{p.codigo} - {p.titulo}</option>)}
                  </select>"""
client = client.replace(old_dropdown, new_dropdown)

with open(client_path, 'w') as f:
    f.write(client)


# 4. Update ResponsaveisClient.tsx
resp_client_path = 'src/app/dashboard/simulados/responsaveis/ResponsaveisClient.tsx'
with open(resp_client_path, 'r') as f:
    resp_client = f.read()

resp_client = resp_client.replace(
    '  codigo: number\n  turmaId: string | null\n}',
    '  codigo: number\n  turmaId: string | null\n  createdAt: Date\n}'
)

resp_old_dropdown = """                <select
                  required
                  value={formData.provaId}
                  onChange={e => setFormData(p => ({ ...p, provaId: e.target.value, areaId: "" }))}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-500 outline-none"
                  disabled={!formData.turmaId}
                >
                  <option value="">Selecione a Prova...</option>
                  {provas.filter(p => p.turmaId === formData.turmaId || !p.turmaId).map(p => (
                    <option key={p.id} value={p.id}>#{p.codigo} - {p.titulo}</option>
                  ))}
                </select>"""

resp_new_dropdown = """                <select
                  required
                  value={formData.provaId}
                  onChange={e => setFormData(p => ({ ...p, provaId: e.target.value, areaId: "" }))}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-500 outline-none"
                  disabled={!formData.turmaId}
                >
                  <option value="">Selecione a Prova...</option>
                  {provas.filter(p => {
                     if (p.turmaId && p.turmaId !== formData.turmaId) return false;
                     const isOld = new Date(p.createdAt) < new Date("2026-07-29T00:00:00Z");
                     if (formData.unidade === "1") return isOld;
                     if (formData.unidade === "2") return !isOld;
                     return true;
                  }).map(p => (
                    <option key={p.id} value={p.id}>#{p.codigo} - {p.titulo}</option>
                  ))}
                </select>"""
resp_client = resp_client.replace(resp_old_dropdown, resp_new_dropdown)

with open(resp_client_path, 'w') as f:
    f.write(resp_client)

print("Dates logic added.")
