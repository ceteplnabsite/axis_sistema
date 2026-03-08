const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const andressa = await prisma.user.findFirst({
    where: { OR: [{ name: { contains: 'Andressa', mode: 'insensitive' } }, { username: { contains: 'andressa', mode: 'insensitive' } }] }
  });

  if (!andressa) {
    console.log("Usuário Andressa não encontrado.");
    return;
  }

  console.log("Usuário encontrado:", andressa.name, andressa.id);

  const turmas = await prisma.turma.findMany({ take: 2 });
  if (turmas.length === 0) {
    console.log("Nenhuma turma encontrada para vincular o plano.");
    return;
  }

  const planos = [
    {
      disciplinaNome: 'Algoritmos e Linguagem de Programação',
      periodoInicio: new Date('2026-02-01T00:00:00.000Z'),
      periodoFim: new Date('2026-04-30T00:00:00.000Z'),
      indicadores: 'O aluno deverá ser capaz de compreender a lógica de programação, criar algoritmos básicos usando estruturas de condição e repetição, e traduzir esses algoritmos para a linguagem de programação estudada com eficiência.',
      conteudos: '1. Introdução à Lógica de Programação. 2. Variáveis, Tipos de Dados e Operadores. 3. Estruturas Condicionais (Se-Então, Escolha-Caso). 4. Estruturas de Repetição (Para, Enquanto, Faça-Enquanto). 5. Arrays e Vetores.',
      metodologias: 'Aulas teóricas expositivas com apoio de slides e lousa interativa. Aulas práticas em laboratório com resolução ativa de problemas, dinâmicas de pair programming (programação em pares) e mini-desafios.',
      recursos: 'Laboratório de Informática, Projetor Multimídia, Ambiente de Desenvolvimento (IDE) instalado, Plataforma online de exercícios lógicos.',
      avaliacao: 'Verificação contínua do desenvolvimento das habilidades através das listas de exercícios práticos em laboratório. 1 Avaliação escrita teórica (30%), 1 Projeto Prático individual completo (70%).',
      observacoes: 'Serão oferecidas monitorias semanais no contraturno para alunos com dificuldade na assimilação da lógica.',
      professorId: andressa.id,
      turmas: { connect: turmas.map(t => ({ id: t.id })) }
    },
    {
      disciplinaNome: 'Banco de Dados',
      periodoInicio: new Date('2026-05-01T00:00:00.000Z'),
      periodoFim: new Date('2026-07-15T00:00:00.000Z'),
      indicadores: 'O aluno deve conseguir modelar um banco de dados relacional (DER), criar as tabelas físicas utilizando SQL e realizar operações de inserção, atualização e consultas (CRUD) utilizando boas práticas.',
      conteudos: '1. Modelagem de Dados: Conceitual, Lógica e Física. 2. Entidades, Atributos e Relacionamentos. 3. Introdução ao SQL (DDL, DML, DQL). 4. Chaves Primárias e Estrangeiras. 5. Consultas Simples e Junções (JOINs).',
      metodologias: 'Aulas com forte apelo visual para modelagem dos diagramas, seguidas de atividades práticas guiadas (hands-on) em SGBD utilizando cenários reais do mercado de trabalho para modelar.',
      recursos: 'Softwares de Modelagem de Dados (ex: brModelo), SGBD PostgreSQL ou MySQL, Slides, Exercícios baseados em estudos de caso.',
      avaliacao: 'Simulados de normalização de dados e relacionamentos. Construção e apresentação de um modelo de BD completo (Modelo Físico e script SQL) avaliado em equipe estruturada na sala.',
      observacoes: 'Enfoque massivo na importância da consistência dos dados nas empresas atuais.',
      professorId: andressa.id,
      turmas: { connect: turmas.map(t => ({ id: t.id })) }
    },
    {
      disciplinaNome: 'Mídias Digitais',
      periodoInicio: new Date('2026-08-01T00:00:00.000Z'),
      periodoFim: new Date('2026-12-01T00:00:00.000Z'),
      indicadores: 'Espera-se que o aluno compreenda o panorama geral das mídias digitais e redes sociais, manipulando vetores e imagens rasters para a criação de artes gráficas direcionadas à web e comunicação digital do curso.',
      conteudos: '1. História da Internet e o impacto das redes sociais. 2. Tipos de Imagem: Vetor e Bitmap. 3. Fundamentos de Design e Tipografia no digital. 4. Edição Básica de Imagens. 5. Ferramentas e Layouts para mídias onlines.',
      metodologias: 'Laboratórios práticos contínuos (Sala Invertida). O aluno receberá demandas simuladas de clientes e aplicará a teoria orientada em tempo real montando as peças gráficas adequadas para o meio.',
      recursos: 'Laboratório de Informática, Adobe Photoshop ou Alternativas Open Source (Gimp, Inkscape, Canva PRO), Portfólio de Referências e Layouts base.',
      avaliacao: 'Avaliação estritamente prática baseada em entregáveis quinzenais (peças gráficas finalizadas postadas no ambiente virtual). Onde a nota final será a média criativa do Portfólio do semestre.',
      observacoes: 'As melhores artes poderão ser utilizadas na feira de tecnologia do colégio.',
      professorId: andressa.id,
      turmas: { connect: turmas.map(t => ({ id: t.id })) }
    }
  ];

  let added = 0;
  for (const plano of planos) {
    await prisma.planoEnsino.create({ data: plano });
    added++;
  }

  console.log(`Sucesso: ${added} planos de aula foram criados para a professora ${andressa.name}.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
