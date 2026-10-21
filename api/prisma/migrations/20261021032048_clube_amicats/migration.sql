-- CreateTable
CREATE TABLE "planos_clube" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "valor_centavos" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planos_clube_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assinaturas" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plano_id" UUID NOT NULL,
    "valor_centavos" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "mp_id" TEXT,
    "checkout_url" TEXT,
    "proxima_cobranca" TIMESTAMP(3),
    "ativada_em" TIMESTAMP(3),
    "cancelada_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assinaturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cobrancas_assinatura" (
    "id" UUID NOT NULL,
    "assinatura_id" UUID NOT NULL,
    "mp_id" TEXT NOT NULL,
    "valor_centavos" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cobrancas_assinatura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assinaturas_mp_id_key" ON "assinaturas"("mp_id");

-- CreateIndex
CREATE INDEX "assinaturas_user_id_idx" ON "assinaturas"("user_id");

-- CreateIndex
CREATE INDEX "assinaturas_status_idx" ON "assinaturas"("status");

-- CreateIndex
CREATE UNIQUE INDEX "cobrancas_assinatura_mp_id_key" ON "cobrancas_assinatura"("mp_id");

-- CreateIndex
CREATE INDEX "cobrancas_assinatura_assinatura_id_idx" ON "cobrancas_assinatura"("assinatura_id");

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_plano_id_fkey" FOREIGN KEY ("plano_id") REFERENCES "planos_clube"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobrancas_assinatura" ADD CONSTRAINT "cobrancas_assinatura_assinatura_id_fkey" FOREIGN KEY ("assinatura_id") REFERENCES "assinaturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
