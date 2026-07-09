const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function normalizeText(text) {
    if (!text) return '';
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function classifyDisciplinaId(nome) {
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
        norm.includes("hb hciaa") || 
        norm.includes("indigena") || 
        norm.includes("afro") || 
        norm.includes("empreendedorismo social") || 
        norm.includes("economia solidaria") ||
        norm.includes("projetos de tecnologias") ||
        norm.includes("projeto de tecnologia") ||
        norm.includes("estacao aprofundamento")) {
        return "articuladoras";
    }

    if (linguagens.includes(norm)) return "linguagens";
    if (matematica.includes(norm)) return "matematica";
    if (natureza.includes(norm)) return "ciencias-natureza";
    if (humanas.includes(norm)) return "ciencias-aplicadas";

    return "formacao-tecnica";
}

async function main() {
    // 1. Ensure Articuladoras area exists
    await prisma.areaConhecimento.upsert({
        where: { id: 'articuladoras' },
        update: {},
        create: {
            id: 'articuladoras',
            nome: 'Disciplinas Articuladoras'
        }
    });
    console.log("Área 'Disciplinas Articuladoras' verificada/criada.");

    let updatedMatrizes = 0;
    let updatedDisciplinas = 0;

    // 2. Update MatrizCurricular for serie "1"
    const matrizes = await prisma.matrizCurricular.findMany({
        where: { serie: "1" }
    });

    for (const m of matrizes) {
        const targetAreaId = classifyDisciplinaId(m.nome);
        if (m.areaId !== targetAreaId) {
            await prisma.matrizCurricular.update({
                where: { id: m.id },
                data: { areaId: targetAreaId }
            });
            updatedMatrizes++;
        }
    }
    console.log(`✅ ${updatedMatrizes} registros de MatrizCurricular (1º Ano) foram atualizados.`);

    // 3. Update Disciplinas for turmas where serie "1"
    const disciplinas = await prisma.disciplina.findMany({
        where: { turma: { serie: "1" } }
    });

    for (const d of disciplinas) {
        const targetAreaId = classifyDisciplinaId(d.nome);
        if (d.areaId !== targetAreaId) {
            await prisma.disciplina.update({
                where: { id: d.id },
                data: { areaId: targetAreaId }
            });
            updatedDisciplinas++;
        }
    }
    console.log(`✅ ${updatedDisciplinas} registros de Disciplina (Turmas do 1º Ano) foram atualizados.`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
