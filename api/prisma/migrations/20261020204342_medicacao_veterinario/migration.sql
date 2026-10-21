-- CreateTable
CREATE TABLE "prescricoes" (
    "id" UUID NOT NULL,
    "gato_id" UUID NOT NULL,
    "medicamento" TEXT NOT NULL,
    "dose" TEXT NOT NULL,
    "via" TEXT NOT NULL,
    "intervalo_horas" INTEGER NOT NULL,
    "inicio" TIMESTAMPTZ(3) NOT NULL,
    "fim" TIMESTAMPTZ(3),
    "encerrada_em" TIMESTAMPTZ(3),
    "prescrito_por" TEXT,
    "observacao" TEXT NOT NULL DEFAULT '',
    "criado_por_id" UUID,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescricoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aplicacoes" (
    "id" UUID NOT NULL,
    "prescricao_id" UUID NOT NULL,
    "horario_previsto" TIMESTAMPTZ(3) NOT NULL,
    "aplicada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pulada" BOOLEAN NOT NULL DEFAULT false,
    "observacao" TEXT NOT NULL DEFAULT '',
    "aplicada_por_id" UUID,

    CONSTRAINT "aplicacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_veterinarios" (
    "id" UUID NOT NULL,
    "gato_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "local" TEXT,
    "observacao" TEXT NOT NULL DEFAULT '',
    "proxima_data" DATE,
    "registrado_por_id" UUID,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eventos_veterinarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prescricoes_gato_id_idx" ON "prescricoes"("gato_id");

-- CreateIndex
CREATE UNIQUE INDEX "aplicacoes_prescricao_id_horario_previsto_key" ON "aplicacoes"("prescricao_id", "horario_previsto");

-- CreateIndex
CREATE INDEX "eventos_veterinarios_gato_id_data_idx" ON "eventos_veterinarios"("gato_id", "data");

-- CreateIndex
CREATE INDEX "eventos_veterinarios_proxima_data_idx" ON "eventos_veterinarios"("proxima_data");

-- AddForeignKey
ALTER TABLE "prescricoes" ADD CONSTRAINT "prescricoes_gato_id_fkey" FOREIGN KEY ("gato_id") REFERENCES "gatos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescricoes" ADD CONSTRAINT "prescricoes_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aplicacoes" ADD CONSTRAINT "aplicacoes_prescricao_id_fkey" FOREIGN KEY ("prescricao_id") REFERENCES "prescricoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aplicacoes" ADD CONSTRAINT "aplicacoes_aplicada_por_id_fkey" FOREIGN KEY ("aplicada_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_veterinarios" ADD CONSTRAINT "eventos_veterinarios_gato_id_fkey" FOREIGN KEY ("gato_id") REFERENCES "gatos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_veterinarios" ADD CONSTRAINT "eventos_veterinarios_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
