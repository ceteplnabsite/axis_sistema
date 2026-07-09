const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

function normalizeText(text) {
    if (!text) return '';
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function classifyDisciplina(nome, serie) {
    const norm = normalizeText(nome);
    
    // Linguagens
    const linguagens = ["lingua portuguesa", "literatura", "arte", "artes", "educacao fisica", "lingua inglesa", "lingua espanhola", "ingles", "espanhol"];
    // Matemática
    const matematica = ["matematica"];
    // Ciências da Natureza
    const natureza = ["biologia", "fisica", "quimica"];
    // Ciências Humanas
    const humanas = ["historia", "geografia", "filosofia", "sociologia"];
    
    // Articuladoras (Variáveis por série e nomes complexos)
    if (norm.includes("iniciacao cientifica") || 
        norm.includes("educacao digital") || 
        norm.includes("midiatica") || 
        norm.includes("historia da bahia") || 
        norm.includes("indigena") || 
        norm.includes("afro") || 
        norm.includes("empreendedorismo social") || 
        norm.includes("economia solidaria") ||
        norm.includes("projetos de tecnologias") ||
        norm.includes("projeto de tecnologia") ||
        norm.includes("estacao aprofundamento")) {
        return "Disciplinas Articuladoras";
    }

    if (linguagens.includes(norm)) return "Linguagens";
    if (matematica.includes(norm)) return "Matemática";
    if (natureza.includes(norm)) return "Ciências da Natureza";
    if (humanas.includes(norm)) return "Ciências Humanas e Aplicadas";

    return "Formação Técnica e Profissional";
}

async function main() {
    const matrizes = await prisma.matrizCurricular.findMany({
        orderBy: [{ serie: 'asc' }, { nome: 'asc' }]
    });

    const bySerie = {};

    for (const m of matrizes) {
        if (!bySerie[m.serie]) {
            bySerie[m.serie] = {};
        }
        
        const classification = classifyDisciplina(m.nome, m.serie);
        
        if (!bySerie[m.serie][classification]) {
            bySerie[m.serie][classification] = new Set();
        }
        
        bySerie[m.serie][classification].add(m.nome);
    }

    let md = "# Preview da Migração de Áreas de Conhecimento\n\n";
    md += "Abaixo está a simulação de como cada disciplina da **Matriz Curricular**, separada por série, será classificada automaticamente.\n\n";

    for (const serie of Object.keys(bySerie).sort()) {
        md += `## ${serie}º Ano\n\n`;
        
        const areas = Object.keys(bySerie[serie]).sort();
        for (const area of areas) {
            md += `### ${area}\n`;
            const disciplinas = Array.from(bySerie[serie][area]).sort();
            for (const d of disciplinas) {
                md += `- ${d}\n`;
            }
            md += "\n";
        }
    }

    fs.writeFileSync('/Users/andressamirella/.gemini/antigravity-ide/brain/6af7d276-0f91-41c7-b288-5ee440e5ede0/preview_areas.md', md);
    console.log("Preview generated");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
