-- Lembrete diário de notas não lançadas: configuração na tela Configurações (admin master).
-- Somente acréscimo de colunas; pode rodar mais de uma vez sem efeito colateral.
-- Aplicar na PRODUÇÃO antes (ou junto) do deploy desta versão.
ALTER TABLE "configs" ADD COLUMN IF NOT EXISTS "lembrete_notas_ativo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "configs" ADD COLUMN IF NOT EXISTS "lembrete_notas_inicio" TEXT NOT NULL DEFAULT '2026-11-20';
