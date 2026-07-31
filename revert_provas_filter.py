import re

with open('src/app/dashboard/simulados/page.tsx', 'r') as f:
    content = f.read()

# 1. Revert select in page.tsx
select_wrong = "select: { id: true, titulo: true, codigo: true, turmaId: true, createdAt: true, turmas: { select: { id: true } } }"
select_correct = "select: { id: true, titulo: true, codigo: true, turmaId: true, createdAt: true }"
content = content.replace(select_wrong, select_correct)

with open('src/app/dashboard/simulados/page.tsx', 'w') as f:
    f.write(content)

with open('src/app/dashboard/simulados/SimuladosClient.tsx', 'r') as f:
    content = f.read()

# 2. Revert the frontend filter, removing `p.turmas` usage
bad_filter = """                     {provas.filter(p => {
                        const isAdmin = user.isSuperuser || user.isDirecao;
                        if (!isAdmin) {
                           if (p.turmas && p.turmas.length > 0) {
                              if (!p.turmas.some((t: any) => t.id === selectedTurma)) return false;
                           } else if (p.turmaId && p.turmaId !== selectedTurma) {
                              return false;
                           }
                        }"""

good_filter = """                     {provas.filter(p => {
                        const isAdmin = user.isSuperuser || user.isDirecao;
                        if (!isAdmin) {
                           if (p.turmaId && p.turmaId !== selectedTurma) return false;
                        }"""
content = content.replace(bad_filter, good_filter)

with open('src/app/dashboard/simulados/SimuladosClient.tsx', 'w') as f:
    f.write(content)

print("Reverted provas filter")
