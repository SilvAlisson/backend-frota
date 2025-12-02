-- DropForeignKey
ALTER TABLE "OrdemServico" DROP CONSTRAINT "OrdemServico_veiculoId_fkey";

-- AlterTable
ALTER TABLE "OrdemServico" ALTER COLUMN "kmAtual" DROP NOT NULL,
ALTER COLUMN "veiculoId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "OrdemServico" ADD CONSTRAINT "OrdemServico_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "Veiculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
