import re

with open('src/app/dashboard/simulados/page.tsx', 'r') as f:
    content = f.read()

# 1. Update select to include turmas relation in page.tsx
select_old = "select: { id: true, titulo: true, codigo: true, turmaId: true, createdAt: true }"
select_new = "select: { id: true, titulo: true, codigo: true, turmaId: true, createdAt: true, turmas: { select: { id: true } } }"
content = content.replace(select_old, select_new)

with open('src/app/dashboard/simulados/page.tsx', 'w') as f:
    f.write(content)

with open('src/app/dashboard/simulados/SimuladosClient.tsx', 'r') as f:
    content = f.read()

# 2. Update the frontend filter
old_filter = """                     {provas.filter(p => {
                        if (p.turmaId && p.turmaId !== selectedTurma) return false;"""

new_filter = """                     {provas.filter(p => {
                        const isAdmin = user.isSuperuser || user.isDirecao;
                        if (!isAdmin) {
                           if (p.turmas && p.turmas.length > 0) {
                              if (!p.turmas.some((t: any) => t.id === selectedTurma)) return false;
                           } else if (p.turmaId && p.turmaId !== selectedTurma) {
                              return false;
                           }
                        }"""

content = content.replace(old_filter, new_filter)

with open('src/app/dashboard/simulados/SimuladosClient.tsx', 'w') as f:
    f.write(content)

print("Fixed provas filter")
