-- CreateEnum
CREATE TYPE "StatusVeiculo" AS ENUM ('ATIVO', 'EM_MANUTENCAO', 'INATIVO');

-- CreateEnum
CREATE TYPE "StatusOS" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

-- AlterTable
ALTER TABLE "OrdemServico" ADD COLUMN     "status" "StatusOS" NOT NULL DEFAULT 'CONCLUIDA';

-- AlterTable
ALTER TABLE "Veiculo" ADD COLUMN     "status" "StatusVeiculo" NOT NULL DEFAULT 'ATIVO';

-- CreateTable
CREATE TABLE "HistoricoKm" (
    "id" TEXT NOT NULL,
    "km" DOUBLE PRECISION NOT NULL,
    "dataLeitura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origem" TEXT NOT NULL,
    "origemId" TEXT,
    "veiculoId" TEXT NOT NULL,

    CONSTRAINT "HistoricoKm_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "HistoricoKm" ADD CONSTRAINT "HistoricoKm_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "Veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
