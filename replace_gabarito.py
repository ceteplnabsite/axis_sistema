import re

with open('src/app/dashboard/simulados/SimuladosClient.tsx', 'r') as f:
    content = f.read()

# 1. Import GabaritoProfessor
import_statement = "import GabaritoProfessor from './GabaritoProfessor'"
if "import GabaritoProfessor" not in content:
    content = content.replace("import { useState, useEffect } from 'react'", "import { useState, useEffect } from 'react'\n" + import_statement)


# 2. Replace the inline gabarito I previously injected
start_marker = "{/* Gabarito Inline */}"
end_marker = "        {/* Lançamento Estilo Resultados */}"

import re
pattern = re.compile(re.escape(start_marker) + r'.*?' + re.escape(end_marker), re.DOTALL)

new_gabarito = """{/* Gabarito Inline */}
        {gabarito && gabarito.length > 0 && (
          <GabaritoProfessor 
            titulo={provas.find(p => p.id === selectedProva)?.titulo || 'Simulado'}
            questoes={gabarito} 
            maxNota={4.0} 
          />
        )}
        {/* Lançamento Estilo Resultados */}"""

content = pattern.sub(new_gabarito, content)

with open('src/app/dashboard/simulados/SimuladosClient.tsx', 'w') as f:
    f.write(content)

print("Replaced Gabarito logic with the new component.")
