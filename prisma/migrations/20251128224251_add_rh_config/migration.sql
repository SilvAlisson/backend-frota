-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'RH';
ALTER TYPE "UserRole" ADD VALUE 'COORDENADOR';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cnhCategoria" TEXT,
ADD COLUMN     "cnhNumero" TEXT,
ADD COLUMN     "cnhValidade" TIMESTAMP(3),
ADD COLUMN     "dataAdmissao" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ConfiguracaoSistema" (
    "id" TEXT NOT NULL,
    "diasAntecedenciaAlerta" INTEGER NOT NULL DEFAULT 30,
    "kmAntecedenciaAlerta" DOUBLE PRECISION NOT NULL DEFAULT 1500,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracaoSistema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Treinamento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "dataRealizacao" TIMESTAMP(3) NOT NULL,
    "dataVencimento" TIMESTAMP(3),
    "comprovanteUrl" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Treinamento_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Treinamento" ADD CONSTRAINT "Treinamento_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
