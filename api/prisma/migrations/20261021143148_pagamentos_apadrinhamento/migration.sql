-- CreateTable
CREATE TABLE "pagamentos_apadrinhamento" (
    "id" UUID NOT NULL,
    "apadrinhamento_id" UUID NOT NULL,
    "mes" TEXT NOT NULL,
    "valor_centavos" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "mp_preferencia_id" TEXT,
    "mp_pagamento_id" TEXT,
    "checkout_url" TEXT,
    "pago_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagamentos_apadrinhamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_apadrinhamento_mp_preferencia_id_key" ON "pagamentos_apadrinhamento"("mp_preferencia_id");

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_apadrinhamento_mp_pagamento_id_key" ON "pagamentos_apadrinhamento"("mp_pagamento_id");

-- CreateIndex
CREATE INDEX "pagamentos_apadrinhamento_apadrinhamento_id_mes_idx" ON "pagamentos_apadrinhamento"("apadrinhamento_id", "mes");

-- AddForeignKey
ALTER TABLE "pagamentos_apadrinhamento" ADD CONSTRAINT "pagamentos_apadrinhamento_apadrinhamento_id_fkey" FOREIGN KEY ("apadrinhamento_id") REFERENCES "apadrinhamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
