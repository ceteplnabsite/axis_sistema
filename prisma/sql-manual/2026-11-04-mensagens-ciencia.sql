-- Mensagens / Comunicados: "Estou ciente" e comunicado fixado no topo.
-- Somente acréscimos; pode rodar mais de uma vez. Aplicar na PRODUÇÃO antes do deploy desta versão.
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "fixado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "requer_ciencia" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "message_ciencias" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_ciencias_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "message_ciencias_user_id_idx" ON "message_ciencias"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "message_ciencias_message_id_user_id_key" ON "message_ciencias"("message_id", "user_id");
DO $$ BEGIN
  ALTER TABLE "message_ciencias" ADD CONSTRAINT "message_ciencias_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "message_ciencias" ADD CONSTRAINT "message_ciencias_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
