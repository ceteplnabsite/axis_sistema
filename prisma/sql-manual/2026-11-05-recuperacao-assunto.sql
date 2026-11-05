-- Assunto da recuperação por disciplina (preenchido pelo professor; aparece no /resultados para quem está em RC).
-- Só adiciona colunas, todas opcionais.
ALTER TABLE disciplinas ADD COLUMN IF NOT EXISTS recuperacao_assunto TEXT;
ALTER TABLE disciplinas ADD COLUMN IF NOT EXISTS recuperacao_data TIMESTAMP(3);
ALTER TABLE disciplinas ADD COLUMN IF NOT EXISTS recuperacao_orientacoes TEXT;
ALTER TABLE disciplinas ADD COLUMN IF NOT EXISTS recuperacao_atualizado_em TIMESTAMP(3);
ALTER TABLE disciplinas ADD COLUMN IF NOT EXISTS recuperacao_atualizado_por TEXT;
