-- AlterTable
ALTER TABLE "Jornada" ADD COLUMN     "erroAutoFechamento" TEXT,
ADD COLUMN     "tentativasAutoFechamento" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Jornada_dataFim_tentativasAutoFechamento_idx" ON "Jornada"("dataFim", "tentativasAutoFechamento");
