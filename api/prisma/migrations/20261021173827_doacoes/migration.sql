-- CreateTable
CREATE TABLE "doacoes" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "valor_centavos" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "mp_preferencia_id" TEXT,
    "mp_pagamento_id" TEXT,
    "checkout_url" TEXT,
    "pago_em" TIMESTAMP(3),
    "agradecida_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "doacoes_mp_preferencia_id_key" ON "doacoes"("mp_preferencia_id");

-- CreateIndex
CREATE UNIQUE INDEX "doacoes_mp_pagamento_id_key" ON "doacoes"("mp_pagamento_id");

-- CreateIndex
CREATE INDEX "doacoes_status_idx" ON "doacoes"("status");

-- CreateIndex
CREATE INDEX "doacoes_user_id_idx" ON "doacoes"("user_id");

-- AddForeignKey
ALTER TABLE "doacoes" ADD CONSTRAINT "doacoes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
