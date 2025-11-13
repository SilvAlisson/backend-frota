-- CreateTable
CREATE TABLE "Veiculo" (
    "placa" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,

    CONSTRAINT "Veiculo_pkey" PRIMARY KEY ("placa")
);

-- CreateTable
CREATE TABLE "Abastecimento" (
    "id" SERIAL NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "km" DOUBLE PRECISION NOT NULL,
    "litros" DOUBLE PRECISION NOT NULL,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "veiculoId" TEXT NOT NULL,

    CONSTRAINT "Abastecimento_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Abastecimento" ADD CONSTRAINT "Abastecimento_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "Veiculo"("placa") ON DELETE RESTRICT ON UPDATE CASCADE;
