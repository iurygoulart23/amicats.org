-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notificar_por_email" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL DEFAULT '',
    "link" TEXT,
    "chave" TEXT NOT NULL,
    "lida_em" TIMESTAMP(3),
    "email_enviado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notificacoes_user_id_lida_em_idx" ON "notificacoes"("user_id", "lida_em");

-- CreateIndex
CREATE UNIQUE INDEX "notificacoes_user_id_chave_key" ON "notificacoes"("user_id", "chave");

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
