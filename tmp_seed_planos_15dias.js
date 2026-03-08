const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const andressaId = 'cmlra447000033uyc5l1667vs';

  const turmas = await prisma.turma.findMany({ take: 2 });
  if (turmas.length === 0) {
    console.log("Nenhuma turma encontrada para vincular o plano.");
    return;
  }

  const disciplinasAlgoritmo = await prisma.disciplina.findFirst({
    where: { nome: { contains: 'Algoritmos' } }
  });
  
  const nomeDisciplina = disciplinasAlgoritmo ? disciplinasAlgoritmo.nome : 'Algoritmos e Linguagem de Programação';

  const basePlanos = [
    {
      periodoInicio: new Date('2026-01-01T00:00:00.000Z'),
      periodoFim: new Date('2026-01-15T00:00:00.000Z'),
      indicadores: 'O aluno será capaz de compreender a relação entre hardware e software, bem como entender os conceitos fundamentais de algoritmos verbais e fluxogramas.',
      conteudos: '1. O que é um Computador? (Hardware vs Software)\n2. O conceito de Algoritmo no cotidiano.\n3. Formas de representação: Portugol e Fluxogramas.',
      metodologias: 'Aulas teóricas expositivas dinâmicas e dinâmicas em grupo sem uso de computadores (unplugged computing).',
      recursos: 'Quadro branco, projetor, folhas sulfites e post-its para as atividades de fluxograma mental.',
      avaliacao: 'Avaliação através da participação na dinâmica do "Robô Humano" (instruções algorítmicas entre colegas).',
      observacoes: 'Os alunos demonstraram facilidade em absorver a lógica de instrução em passos.'
    },
    {
      periodoInicio: new Date('2026-01-16T00:00:00.000Z'),
      periodoFim: new Date('2026-01-30T00:00:00.000Z'),
      indicadores: 'O estudante deve classificar os tipos primitivos e saber aplicar variáveis em memória para resolução de fluxos de dados simples.',
      conteudos: '1. O que são variáveis e constantes.\n2. Tipos de dados (Inteiro, Real, Caractere, Lógico).\n3. Operadores Aritméticos e precedência matemática.',
      metodologias: 'Misto de aula teórica e primeira prática com VisualG / Portugol Studio no laboratório.',
      recursos: 'Laboratório de Informática, Software VisualG instalado. Projetor para o código fonte guiado (Live Coding).',
      avaliacao: 'Lista de exercícios práticos com 10 algoritmos matemáticos (cálculo de média, área de figuras geométricas).',
      observacoes: 'Necessário reforçar o conceito de atribuição (<-) vs igualdade (=).'
    },
    {
      periodoInicio: new Date('2026-01-31T00:00:00.000Z'),
      periodoFim: new Date('2026-02-14T00:00:00.000Z'),
      indicadores: 'O aluno deverá desenvolver raciocínio lógico focado em tomadas de decisões computacionais através de desvios condicionais.',
      conteudos: '1. Desvios Condicionais Simples (Se - Então).\n2. Desvios Condicionais Compostos (Se - Então - Senão).\n3. Operadores Relacionais (>, <, >=, <=, !=).',
      metodologias: 'Resolução de problemas do mundo real em duplas (Pair Programming) testando hipóteses lógicas no laboratório.',
      recursos: 'Laboratório de Informática, material em PDF com estudos de caso de validação de dados.',
      avaliacao: 'Avaliação prática em laboratório. O aluno deverá criar um sistema de validação de notas e aprovação escolar.',
      observacoes: 'Alunos conseguiram ligar bem o conceito a sistemas que já existem, como a tela de notas deles.'
    },
    {
      periodoInicio: new Date('2026-02-15T00:00:00.000Z'),
      periodoFim: new Date('2026-03-01T00:00:00.000Z'),
      indicadores: 'Espera-se que a turma concatene regras lógicas complexas e crie menus interativos no console.',
      conteudos: '1. Operadores Lógicos (E, OU, NÃO).\n2. Tabela Verdade.\n3. Estruturas de Seleção Múltipla (Escolha - Caso).',
      metodologias: 'Sala Invertida: Alunos leem pesquisa prévia em casa sobre Tabela Verdade. Em sala, ocorre um debate seguido de gamificação estruturada.',
      recursos: 'Plataforma interativa no laboratório. Lousa para resolução algorítmica conjunta do desafio do dia.',
      avaliacao: 'Desenvolvimento de uma mini-calculadora funcional no terminal com opções de menu (Soma, Subtração, Sair).',
      observacoes: 'Módulo com alto grau de sucesso prático e engajamento forte.'
    },
    {
      periodoInicio: new Date('2026-03-02T00:00:00.000Z'),
      periodoFim: new Date('2026-03-16T00:00:00.000Z'),
      indicadores: 'Introduzir e massificar o conceito de que o computador é excelente em realizar laços finitos até satisfazer uma condição.',
      conteudos: '1. Necessidade de código em massa.\n2. Estrutura de Repetição Padrão (Enquanto / While).\n3. Contadores e Acumuladores em memória.',
      metodologias: 'Apresentação lúdica da "Dor de copiar código 1000 vezes". Posteriormente live coding mostrando a economia do While.',
      recursos: 'Ambiente VisualG ou Portugol Web. Telão com espelhamento da máquina do professor.',
      avaliacao: '1 Avaliação Dissertativa (Papel e Caneta) validando o teste de mesa de um laço de repetição complexo.',
      observacoes: 'Acompanhando evolução esta quinzena.'
    }
  ];

  let added = 0;
  for (const info of basePlanos) {
    const plano = {
      disciplinaNome: nomeDisciplina,
      periodoInicio: info.periodoInicio,
      periodoFim: info.periodoFim,
      indicadores: info.indicadores,
      conteudos: info.conteudos,
      metodologias: info.metodologias,
      recursos: info.recursos,
      avaliacao: info.avaliacao,
      observacoes: info.observacoes,
      professorId: andressaId,
      turmas: { connect: turmas.map(t => ({ id: t.id })) }
    };
    await prisma.planoEnsino.create({ data: plano });
    added++;
  }

  console.log(`Sucesso: ${added} novos planos de ensino de Algoritmos (quinzenais) foram criados e injetados de Janeiro até o dia atual (Março).`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
