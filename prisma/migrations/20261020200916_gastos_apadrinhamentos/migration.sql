-- CreateTable
CREATE TABLE "gastos" (
    "id" UUID NOT NULL,
    "gato_id" UUID NOT NULL,
    "categoria" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor_centavos" INTEGER NOT NULL,
    "data" DATE NOT NULL,
    "registrado_por_id" UUID,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gastos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apadrinhamentos" (
    "id" UUID NOT NULL,
    "gato_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "inicio" DATE NOT NULL,
    "fim" DATE,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "apadrinhamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gastos_gato_id_data_idx" ON "gastos"("gato_id", "data");

-- CreateIndex
CREATE INDEX "apadrinhamentos_gato_id_idx" ON "apadrinhamentos"("gato_id");

-- CreateIndex
CREATE INDEX "apadrinhamentos_user_id_idx" ON "apadrinhamentos"("user_id");

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_gato_id_fkey" FOREIGN KEY ("gato_id") REFERENCES "gatos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apadrinhamentos" ADD CONSTRAINT "apadrinhamentos_gato_id_fkey" FOREIGN KEY ("gato_id") REFERENCES "gatos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apadrinhamentos" ADD CONSTRAINT "apadrinhamentos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
