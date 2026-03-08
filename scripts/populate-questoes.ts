import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Função auxiliar para gerar 6 questões
// Algumas disciplinas específicas e as demais recebem conteúdo genérico
const questoesDict: Record<string, any[]> = {
  "Algoritmos e Linguagem de Programação": [
    { enunciado: "O que é um algoritmo?", a: "Uma sequência finita de passos bem definidos para resolver um problema.", b: "Uma linguagem de montagem.", c: "Um componente de hardware.", d: "Um tipo de banco de dados.", e: "Um software antivírus.", correta: "A" },
    { enunciado: "Qual estrutura repete um bloco enquanto a condição é verdadeira?", a: "if", b: "switch", c: "while", d: "class", e: "return", correta: "C" },
    { enunciado: "O que representa uma variável num programa?", a: "Um erro de compilação.", b: "Um espaço na memória RAM para guardar um dado.", c: "Um arquivo no disco rígido.", d: "Uma constante que nunca muda.", e: "Um processo que limpa a memória.", correta: "B" },
    { enunciado: "Qual o tipo de dado lógico que só possui dois estados?", a: "Integer", b: "String", c: "Float", d: "Boolean (Booleano)", e: "Array", correta: "D" },
    { enunciado: "O que é 'compilar' código?", a: "Criar uma interface gráfica.", b: "Traduzir o código-fonte para linguagem de máquina.", c: "Mover o código para a nuvem.", d: "Apagar os bugs do código.", e: "Gerar senhas automáticas.", correta: "B" },
    { enunciado: "Um array (vetor) serve para:", a: "Criar botões na tela.", b: "Executar um laço infinito.", c: "Armazenar múltiplos valores de um mesmo tipo numa única estrutura.", d: "Conectar com banco de dados.", e: "Esconder metadados de arquivos.", correta: "C" }
  ],
  "Banco de Dados": [
    { enunciado: "Qual a principal linguagem de consulta em bancos de dados relacionais?", a: "HTML", b: "SQL", c: "CSS", d: "C++", e: "Java", correta: "B" },
    { enunciado: "O que faz o comando SELECT?", a: "Recupera dados de uma ou mais tabelas.", b: "Apaga uma tabela inteira.", c: "Cria um novo banco de dados.", d: "Atualiza linhas existentes.", e: "Gera regras de segurança de rede.", correta: "A" },
    { enunciado: "O que é uma Chave Primária (Primary Key)?", a: "Um campo genérico que permite nulos.", b: "A porta de acesso do servidor SQL.", c: "A senha de administrador do banco.", d: "Um identificador único de um registro na tabela.", e: "Apenas uma indexação secundária no disco.", correta: "D" },
    { enunciado: "Uma Chave Estrangeira (Foreign Key) é usada para:", a: "Evitar ataques de injeção de SQL.", b: "Compactar o arquivo do banco.", c: "Criar relacionamento entre duas tabelas.", d: "Criptografar os dados.", e: "Transferir dados via FTP.", correta: "C" },
    { enunciado: "Qual comando é usado para remover uma tabela do banco de dados na linguagem SQL?", a: "DROP TABLE", b: "DELETE TABLE", c: "REMOVE TABLE", d: "CLEAR TABLE", e: "DESTROY TABLE", correta: "A" },
    { enunciado: "SGBD significa:", a: "Serviço Global de Busca Digital.", b: "Sistema Gerenciador de Banco de Dados.", c: "Sistema Geral de Backup em Disco.", d: "Software Genérico Baseado em Dados.", e: "Suporte de Gestão para Banco Distribuidos.", correta: "B" }
  ],
  "Biologia": [
    { enunciado: "Qual a unidade básica da vida?", a: "O átomo", b: "A célula", c: "O órgão", d: "O tecido", e: "A molécula", correta: "B" },
    { enunciado: "Organelas responsáveis pela respiração celular e produção de ATP nas células eucarióticas são:", a: "Complexo de Golgi", b: "Mitocôndrias", c: "Ribossomos", d: "Lisossomos", e: "Cloroplastos", correta: "B" },
    { enunciado: "Como é denominado o processo das plantas converterem energia solar em energia química?", a: "Fotossíntese", b: "Fermentação", c: "Glicólise", d: "Quimiossíntese", e: "Transcrição", correta: "A" },
    { enunciado: "A molécula que carrega a informação genética nas células da maioria dos seres vivos é:", a: "A Proteína", b: "O Carboidrato", c: "O DNA", d: "O Lipidío", e: "A Vitamina", correta: "C" },
    { enunciado: "O tipo de divisão celular que reduz pela metade o número de cromossomos chama-se:", a: "Mitose", b: "Meiose", c: "Fissão Binária", d: "Clonagem reprodutiva", e: "Cissiparidade", correta: "B" },
    { enunciado: "O bioma brasileiro conhecido por sua extrema diversidade biológica e altos íncices pluviométricos é:", a: "Cerrado", b: "Caatinga", c: "Pampa", d: "Amazônia", e: "Pantanal", correta: "D" }
  ],
  "Física": [
    { enunciado: "Força é igual a massa vezes:", a: "Aceleração", b: "Velocidade", c: "Posição", d: "Volume", e: "Tempo", correta: "A" },
    { enunciado: "Qual é a unidade de medida padrão de Energia no Sistema Internacional?", a: "Newton (N)", b: "Watts (W)", c: "Joule (J)", d: "Volts (V)", e: "Ampere (A)", correta: "C" },
    { enunciado: "A primeira Lei de Newton está ligada ao conceito de:", a: "Ação e Reação", b: "Gravitação", c: "Inércia", d: "Atrito", e: "Pressão de fluídos", correta: "C" },
    { enunciado: "Na queda livre (desprezando a resistência do ar), objetos de massas diferentes:", a: "Caem com a mesma aceleração.", b: "O objeto mais pesado cai mais rápido.", c: "O objeto mais leve cai mais rápido.", d: "A velocidade diminui conforme caem.", e: "Ficam suspensos por mais tempo.", correta: "A" },
    { enunciado: "O que a segunda Lei da Termodinâmica afirma sobre o universo?", a: "A entropia está sempre aumentando.", b: "A energia nunca se transforma.", c: "Calor flui do mais frio para quente.", d: "O zero absoluto é atingível facilmente.", e: "Toda máquina tem 100% de eficiência.", correta: "A" },
    { enunciado: "A resistência elétrica é medida em qual unidade?", a: "Ampere", b: "Coulomb", c: "Ohm (Ω)", d: "Hertz", e: "Farad", correta: "C" }
  ],
  "Matemática": [
    { enunciado: "Qual o resultado de 2 + 2 * 3 na ordem das operações matemáticas?", a: "12", b: "8", c: "14", d: "10", e: "24", correta: "B" },
    { enunciado: "O teorema de Pitágoras é aplicável em triângulos de tipo:", a: "Equilátero", b: "Retângulo", c: "Isósceles", d: "Escaleno", e: "Qualquer tipo de triângulo", correta: "B" },
    { enunciado: "Qual é o valor aproximado de Pi (π)?", a: "1,61", b: "2,71", c: "3,14", d: "4,12", e: "5,00", correta: "C" },
    { enunciado: "A fórmula de Bhaskara é utilizada para encontrar as raízes de qual tipo de equação?", a: "Equação do 1º Grau", b: "Equação Exponencial", c: "Equação Logarítmica", d: "Equação do 2º Grau", e: "Equação Linear", correta: "D" },
    { enunciado: "Considerando a função f(x) = 2x + 1, qual o valor de f(3)?", a: "5", b: "6", c: "7", d: "8", e: "9", correta: "C" },
    { enunciado: "Qual a área de um quadrado de lado 5 metros?", a: "10 m²", b: "20 m²", c: "15 m²", d: "25 m²", e: "30 m²", correta: "D" }
  ]
}

const getGenericQuestions = (nomeDisciplina: string) => {
  return Array.from({ length: 6 }).map((_, i) => ({
    enunciado: `[${nomeDisciplina}] Pergunta teórica e fundamental número ${i + 1} sobre as normativas e fundamentos desta disciplina. Identifique qual das afirmações abaixo está correta.`,
    a: "Afirmação tecnicamente correta formulada de acordo com as normas da base curricular do curso.",
    b: "Afirmação incoerente com o que é defendido pelas práticas modernas da área e pelos autores base.",
    c: "Afirmação que distorce o princípio original estabelecido teoricamente em aula.",
    d: "Afirmação misturando conceitos de outras competências distintas que não têm correlação.",
    e: "Afirmação generalista sem qualquer embasamento científico ou lógico.",
    correta: "A"
  }))
}

async function main() {
  const turmas = await prisma.turma.findMany({ where: { nome: '1TTIM1' } })
  if (turmas.length === 0) {
    console.error("Turma 1TTIM1 não encontrada!")
    return
  }
  
  const turma = turmas[0]
  const disciplinas = await prisma.disciplina.findMany({ where: { turmaId: turma.id } })
  
  if (disciplinas.length === 0) {
    console.log("Sem disciplinas para popular questões.")
    return
  }
  
  let insertedCount = 0

  const users = await prisma.user.findMany({ take: 1 })
  const userId = users[0]?.id

  if (!userId) {
     console.error("Nenhum usuário encontrado no sistema para ser o autor das questões.")
     return
  }

  for (const disc of disciplinas) {
    const rawQuestoes = questoesDict[disc.nome.trim()] || getGenericQuestions(disc.nome)
    
    for (const q of rawQuestoes) {
      // Cria a questão adequando-se ao seu Schema do banco de dados (alternativaA - E) 
      await prisma.questao.create({
        data: {
          enunciado: q.enunciado,
          professorId: userId,
          alternativaA: q.a,
          alternativaB: q.b,
          alternativaC: q.c,
          alternativaD: q.d,
          alternativaE: q.e,
          correta: q.correta,
          dificuldade: "MEDIO",
          status: "APROVADA", // Como as questões já entram com status final aprovado no BD
          turmas: { connect: { id: turma.id } },
          disciplinas: { connect: { id: disc.id } }
        }
      })
      insertedCount++;
    }
  }

  console.log(`Sucesso: ${insertedCount} novas questões foram inseridas no Banco de Questões (6 por disciplina) devidamente associadas à turma ${turma.nome}!`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
