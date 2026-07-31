import re
import sys

# 1. Fix ResponsaveisClient.tsx
with open('src/app/dashboard/simulados/responsaveis/ResponsaveisClient.tsx', 'r') as f:
    r_content = f.read()

r_content = r_content.replace('item.area.nome', 'item.area?.nome')
with open('src/app/dashboard/simulados/responsaveis/ResponsaveisClient.tsx', 'w') as f:
    f.write(r_content)

# 2. Fix SimuladosClient.tsx
with open('src/app/dashboard/simulados/SimuladosClient.tsx', 'r') as f:
    s_content = f.read()

s_content = s_content.replace(
    'Área: {areas.find(a => a.id === selectedArea)?.nome || \'Não selecionada\'}',
    'Prova: {provas.find((p: any) => p.id === selectedProva)?.titulo || \'Não selecionada\'}'
)

s_content = s_content.replace(
    'areas: Area[],',
    ''
)

with open('src/app/dashboard/simulados/SimuladosClient.tsx', 'w') as f:
    f.write(s_content)

print("TS fixes applied.")
