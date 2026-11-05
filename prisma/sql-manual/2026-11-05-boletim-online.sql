-- Boletim online (/boletim): liga/desliga em Configurações. Só adiciona uma coluna; começa desligado.
ALTER TABLE configs ADD COLUMN IF NOT EXISTS boletim_online_ativo BOOLEAN NOT NULL DEFAULT false;
