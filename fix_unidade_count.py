import re

with open('src/app/dashboard/simulados/page.tsx', 'r') as f:
    content = f.read()

select_old = "select: { id: true, titulo: true, codigo: true, turmaId: true, createdAt: true, unidade: true }"
select_new = "select: { id: true, titulo: true, codigo: true, turmaId: true, createdAt: true, unidade: true, _count: { select: { questoes: true } } }"
content = content.replace(select_old, select_new)

with open('src/app/dashboard/simulados/page.tsx', 'w') as f:
    f.write(content)

with open('src/app/dashboard/simulados/SimuladosClient.tsx', 'r') as f:
    content = f.read()

# Replace type definition
type_old = "provas: {id: string, titulo: string, codigo: number, turmaId: string | null, createdAt: Date, unidade: number | null}[]"
type_new = "provas: {id: string, titulo: string, codigo: number, turmaId: string | null, createdAt: Date, unidade: number | null, _count?: { questoes: number }}[]"
content = content.replace(type_old, type_new)

# Update filter logic
old_filter = """                     {provas.filter(p => {
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
                           // Se a prova NÃO tem questões associadas (modelo antigo), é da Unidade 1.
                           // Se tem questões (novo modelo gerador de PDF), é da Unidade 2.
                           if (p._count && p._count.questoes > 0) {
                              isUnidade1 = false;
                           } else {
                              isUnidade1 = true;
                           }
                        }
                        
                        if (selectedUnidade === "1") return isUnidade1;
                        if (selectedUnidade === "2") return !isUnidade1;
                        return true;
                     })"""
content = content.replace(old_filter, new_filter)

with open('src/app/dashboard/simulados/SimuladosClient.tsx', 'w') as f:
    f.write(content)

print("Updated filter logic with _count")
