import re

with open('src/app/dashboard/simulados/page.tsx', 'r') as f:
    content = f.read()

select_old = "select: { id: true, titulo: true, codigo: true, turmaId: true, createdAt: true }"
select_new = "select: { id: true, titulo: true, codigo: true, turmaId: true, createdAt: true, unidade: true }"
content = content.replace(select_old, select_new)

with open('src/app/dashboard/simulados/page.tsx', 'w') as f:
    f.write(content)

with open('src/app/dashboard/simulados/SimuladosClient.tsx', 'r') as f:
    content = f.read()

# Replace type definition
type_old = "provas: {id: string, titulo: string, codigo: number, turmaId: string | null, createdAt: Date}[]"
type_new = "provas: {id: string, titulo: string, codigo: number, turmaId: string | null, createdAt: Date, unidade: number | null}[]"
content = content.replace(type_old, type_new)

# Update filter logic
old_filter = """                     {provas.filter(p => {
                        const isAdmin = user.isSuperuser || user.isDirecao;
                        if (!isAdmin) {
                           if (p.turmaId && p.turmaId !== selectedTurma) return false;
                        }
                        // Filtro de data: limite = 30 de julho de 2026
                        const isOld = new Date(p.createdAt) < new Date("2026-07-29T00:00:00Z");
                        if (selectedUnidade === "1") return isOld;
                        if (selectedUnidade === "2") return !isOld;
                        return true;
                     })"""

new_filter = """                     {provas.filter(p => {
                        const isAdmin = user.isSuperuser || user.isDirecao;
                        if (!isAdmin) {
                           if (p.turmaId && p.turmaId !== selectedTurma) return false;
                        }
                        
                        // Definição de unidade
                        let isUnidade1 = false;
                        if (p.unidade === 1) isUnidade1 = true;
                        else if (p.unidade === 2) isUnidade1 = false;
                        else {
                           // Provas antigas criadas antes da nossa mudança de ontem (30/Julho)
                           // Vamos usar 30 de julho 15:00 UTC como corte
                           isUnidade1 = new Date(p.createdAt) < new Date("2026-07-30T15:00:00Z");
                        }
                        
                        if (selectedUnidade === "1") return isUnidade1;
                        if (selectedUnidade === "2") return !isUnidade1;
                        return true;
                     })"""
content = content.replace(old_filter, new_filter)

with open('src/app/dashboard/simulados/SimuladosClient.tsx', 'w') as f:
    f.write(content)

print("Updated filter logic")
