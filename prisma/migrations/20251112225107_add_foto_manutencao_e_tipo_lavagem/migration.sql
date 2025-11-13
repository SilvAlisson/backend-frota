-- CreateEnum
CREATE TYPE "TipoManutencao" AS ENUM ('PREVENTIVA', 'CORRETIVA', 'LAVAGEM');

-- CreateEnum
CREATE TYPE "TipoIntervaloManutencao" AS ENUM ('KM', 'TEMPO');

-- AlterTable
ALTER TABLE "Abastecimento" ADD COLUMN     "fotoNotaFiscalUrl" TEXT;

-- AlterTable
ALTER TABLE "Veiculo" ADD COLUMN     "vencimentoCipp" TIMESTAMP(3),
ADD COLUMN     "vencimentoCiv" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "OrdemServico" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "kmAtual" DOUBLE PRECISION NOT NULL,
    "custoTotal" DOUBLE PRECISION NOT NULL,
    "tipo" "TipoManutencao" NOT NULL,
    "observacoes" TEXT,
    "fotoComprovanteUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "veiculoId" TEXT NOT NULL,
    "fornecedorId" TEXT NOT NULL,
    "encarregadoId" TEXT NOT NULL,

    CONSTRAINT "OrdemServico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemOrdemServico" (
    "id" TEXT NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "valorPorUnidade" DOUBLE PRECISION NOT NULL,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "ordemServicoId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,

    CONSTRAINT "ItemOrdemServico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanoManutencao" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipoIntervalo" "TipoIntervaloManutencao" NOT NULL,
    "valorIntervalo" DOUBLE PRECISION NOT NULL,
    "kmProximaManutencao" DOUBLE PRECISION,
    "dataProximaManutencao" TIMESTAMP(3),
    "veiculoId" TEXT NOT NULL,

    CONSTRAINT "PlanoManutencao_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrdemServico" ADD CONSTRAINT "OrdemServico_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "Veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdemServico" ADD CONSTRAINT "OrdemServico_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdemServico" ADD CONSTRAINT "OrdemServico_encarregadoId_fkey" FOREIGN KEY ("encarregadoId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemOrdemServico" ADD CONSTRAINT "ItemOrdemServico_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "OrdemServico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemOrdemServico" ADD CONSTRAINT "ItemOrdemServico_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanoManutencao" ADD CONSTRAINT "PlanoManutencao_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "Veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
