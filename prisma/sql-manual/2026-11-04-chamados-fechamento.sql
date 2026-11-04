-- Motivo do fechamento automático de chamados (Fase 2 de Mensagens).
-- Coluna nova e opcional: não altera nenhum dado existente.
-- (internal_status continua sendo a etiqueta da tela de Pendências e não é tocado.)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS fechamento TEXT;
