import re

with open('src/app/dashboard/simulados/page.tsx', 'r') as f:
    content = f.read()

# Add { questoes: { some: { professorId: user.id } } } to OR array
old_or = """        OR: [
          { id: { in: assignedProvaIds } },
          { questoes: { some: { disciplinas: { some: { id: { in: disciplinaIds } } } } } }
        ]"""
        
new_or = """        OR: [
          { id: { in: assignedProvaIds } },
          { questoes: { some: { disciplinas: { some: { id: { in: disciplinaIds } } } } } },
          { questoes: { some: { professorId: user.id } } }
        ]"""
content = content.replace(old_or, new_or)

with open('src/app/dashboard/simulados/page.tsx', 'w') as f:
    f.write(content)

with open('src/app/api/simulados/route.ts', 'r') as f:
    content = f.read()

old_api = """        prova.questoes.forEach(q => {
          q.disciplinas.forEach(d => {
            d.usuariosPermitidos.forEach(u => professoresDaProva.add(u.id))
          })
        })"""

new_api = """        prova.questoes.forEach(q => {
          if (q.professorId) professoresDaProva.add(q.professorId)
          q.disciplinas.forEach(d => {
            d.usuariosPermitidos.forEach(u => professoresDaProva.add(u.id))
          })
        })"""

content = content.replace(old_api, new_api)

with open('src/app/api/simulados/route.ts', 'w') as f:
    f.write(content)

print("Fixed teacher view")
