-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cargoId" TEXT;

-- CreateTable
CREATE TABLE "Cargo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cargo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreinamentoObrigatorio" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "validadeMeses" INTEGER NOT NULL,
    "cargoId" TEXT NOT NULL,

    CONSTRAINT "TreinamentoObrigatorio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cargo_nome_key" ON "Cargo"("nome");

-- AddForeignKey
ALTER TABLE "TreinamentoObrigatorio" ADD CONSTRAINT "TreinamentoObrigatorio_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "Cargo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "Cargo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
