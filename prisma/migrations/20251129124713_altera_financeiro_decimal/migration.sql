/*
  Warnings:

  - You are about to alter the column `custoTotal` on the `Abastecimento` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `valorPorUnidade` on the `ItemAbastecimento` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `valorTotal` on the `ItemAbastecimento` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `valorPorUnidade` on the `ItemOrdemServico` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `valorTotal` on the `ItemOrdemServico` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `custoTotal` on the `OrdemServico` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "Abastecimento" ALTER COLUMN "custoTotal" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "ItemAbastecimento" ALTER COLUMN "valorPorUnidade" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "valorTotal" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "ItemOrdemServico" ALTER COLUMN "valorPorUnidade" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "valorTotal" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "OrdemServico" ALTER COLUMN "custoTotal" SET DATA TYPE DECIMAL(10,2);
