import re

with open('src/app/api/simulados/route.ts', 'r') as f:
    content = f.read()

content = content.replace(
    'gabarito: canEdit ? gabarito : null // Apenas editores (responsáveis) veem o gabarito',
    'gabarito: (canEdit || canView) ? gabarito : null // Editores e visualizadores veem o gabarito'
)

with open('src/app/api/simulados/route.ts', 'w') as f:
    f.write(content)

print("Updated backend gabarito visibility")
