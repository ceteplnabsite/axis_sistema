-- Outros nomes do estudante (nome de registro, nome anterior, nome no SIGEduc), usados só para
-- reconhecer o estudante na importação do SIGEduc. Aditivo; seguro rodar mais de uma vez.
ALTER TABLE "estudantes" ADD COLUMN IF NOT EXISTS "nomes_alternativos" TEXT[] NOT NULL DEFAULT '{}';
