// Lembrete diário de notas não lançadas.
// A data de início e a chave liga/desliga ficam no banco (tela Configurações, admin master);
// a partir da data, TODAS as unidades são cobradas (regulares: 3; PROEJA/PROSUB: 2).

/** Data de início padrão (usada se a configuração ainda não existir no banco) */
export const LEMBRETE_INICIO_PADRAO = '2026-11-20'

/** No e-mail, quantos nomes de alunos listar por disciplina (o resto vira "e mais N") */
export const MAX_NOMES_POR_DISCIPLINA = 15

export const dataValida = (s: unknown): s is string =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(`${s}T12:00:00Z`))

/** Hoje no horário da Bahia, no formato AAAA-MM-DD */
export const hojeNaBahia = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bahia' }).format(new Date())
