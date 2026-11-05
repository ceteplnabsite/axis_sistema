-- Liga/desliga do resumo diário de Mensagens por e-mail (Fase 4).
-- Coluna nova com valor padrão: não altera nenhum dado existente.
ALTER TABLE configs ADD COLUMN IF NOT EXISTS resumo_mensagens_ativo BOOLEAN NOT NULL DEFAULT true;
