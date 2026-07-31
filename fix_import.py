import re

with open('src/app/dashboard/simulados/SimuladosClient.tsx', 'r') as f:
    content = f.read()

if "import GabaritoProfessor" not in content:
    content = content.replace("import { useState, useEffect } from 'react'", "import { useState, useEffect } from 'react'\nimport GabaritoProfessor from './GabaritoProfessor'")
    with open('src/app/dashboard/simulados/SimuladosClient.tsx', 'w') as f:
        f.write(content)
        print("Import added")
else:
    print("Import already exists")
