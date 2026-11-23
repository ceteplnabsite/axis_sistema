-- Rascunho das decisões do Conselho de Classe no servidor (antes ficava só no navegador).
-- Aditivo: só cria a tabela nova. Seguro rodar mais de uma vez.
CREATE TABLE IF NOT EXISTS "conselho_rascunhos" (
  "turma_id"            TEXT PRIMARY KEY REFERENCES "turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "dados"               JSONB NOT NULL,
  "atualizado_em"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_por_id"   TEXT,
  "atualizado_por_nome" TEXT
);
