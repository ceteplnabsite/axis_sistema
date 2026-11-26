-- Notas que o professor informou terem sido alteradas no SIGEduc por outra pessoa (refletem no Conselho).
-- Aditivo: só cria a tabela nova. Seguro rodar mais de uma vez.
CREATE TABLE IF NOT EXISTS "alertas_nota_sigeduc" (
  "id"                 TEXT PRIMARY KEY,
  "estudante_id"       TEXT NOT NULL REFERENCES "estudantes"("matricula") ON DELETE CASCADE ON UPDATE CASCADE,
  "disciplina_id"      TEXT NOT NULL REFERENCES "disciplinas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "unidade"            INTEGER NOT NULL,
  "nota_axis"          DOUBLE PRECISION,
  "nota_sigeduc"       DOUBLE PRECISION,
  "informado_por_id"   TEXT NOT NULL,
  "informado_por_nome" TEXT,
  "criado_em"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvido_em"       TIMESTAMP(3),
  "resolvido_por_nome" TEXT
);
CREATE INDEX IF NOT EXISTS "alertas_nota_sigeduc_disciplina_id_idx" ON "alertas_nota_sigeduc"("disciplina_id");
CREATE INDEX IF NOT EXISTS "alertas_nota_sigeduc_estudante_id_idx" ON "alertas_nota_sigeduc"("estudante_id");
