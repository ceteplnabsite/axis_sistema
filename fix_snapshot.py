import re

with open('src/app/api/simulados/route.ts', 'r') as f:
    content = f.read()

old_logic = """            if (Array.isArray(questoesSnapshot)) {
              gabarito = questoesSnapshot.map((q: any, index: number) => ({
                numero: index + 1,
                correta: q.correta || 'N/A',
                disciplina: q.disciplina || 'Desconhecida'
              }))
            }"""

new_logic = """            const qs = Array.isArray(questoesSnapshot) ? questoesSnapshot : (questoesSnapshot.questoes || []);
            gabarito = qs.map((q: any, index: number) => ({
              numero: index + 1,
              correta: q.correta || 'N/A',
              disciplina: q.disciplina || 'Desconhecida'
            }))"""

content = content.replace(old_logic, new_logic)

with open('src/app/api/simulados/route.ts', 'w') as f:
    f.write(content)

print("Fixed snapshot parsing.")
