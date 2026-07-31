import re

with open('src/app/dashboard/simulados/SimuladosClient.tsx', 'r') as f:
    s_content = f.read()

# Fix prop destructuring
s_content = s_content.replace(
    '  areas, \n  user',
    '  provas, \n  user'
)

# Fix noteSegundaChamada undefined error
s_content = s_content.replace(
    'nota.notaSegundaChamada !== null ? nota.notaSegundaChamada.toString() : ""',
    'nota.notaSegundaChamada ? nota.notaSegundaChamada.toString() : ""'
)

with open('src/app/dashboard/simulados/SimuladosClient.tsx', 'w') as f:
    f.write(s_content)

print("TS fixes applied.")
