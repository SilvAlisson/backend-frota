/*
  Warnings:

  - The primary key for the `Abastecimento` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `data` on the `Abastecimento` table. All the data in the column will be lost.
  - You are about to drop the column `km` on the `Abastecimento` table. All the data in the column will be lost.
  - You are about to drop the column `litros` on the `Abastecimento` table. All the data in the column will be lost.
  - You are about to drop the column `valorTotal` on the `Abastecimento` table. All the data in the column will be lost.
  - The primary key for the `Veiculo` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[placa]` on the table `Veiculo` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `custoTotal` to the `Abastecimento` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dataHora` to the `Abastecimento` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fornecedorId` to the `Abastecimento` table without a default value. This is not possible if the table is not empty.
  - Added the required column `kmOdometro` to the `Abastecimento` table without a default value. This is not possible if the table is not empty.
  - Added the required column `operadorId` to the `Abastecimento` table without a default value. This is not possible if the table is not empty.
  - The required column `id` was added to the `Veiculo` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `updatedAt` to the `Veiculo` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OPERADOR', 'ENCARREGADO', 'ADMIN');

-- CreateEnum
CREATE TYPE "TipoProduto" AS ENUM ('COMBUSTIVEL', 'ADITIVO', 'SERVICO', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoCombustivel" AS ENUM ('DIESEL_S10', 'GASOLINA_COMUM', 'ETANOL', 'GNV');

-- DropForeignKey
ALTER TABLE "public"."Abastecimento" DROP CONSTRAINT "Abastecimento_veiculoId_fkey";

-- AlterTable
ALTER TABLE "Abastecimento" DROP CONSTRAINT "Abastecimento_pkey",
DROP COLUMN "data",
DROP COLUMN "km",
DROP COLUMN "litros",
DROP COLUMN "valorTotal",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "custoTotal" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "dataHora" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "fornecedorId" TEXT NOT NULL,
ADD COLUMN     "kmOdometro" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "operadorId" TEXT NOT NULL,
ADD COLUMN     "placaCartaoUsado" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Abastecimento_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Abastecimento_id_seq";

-- AlterTable
ALTER TABLE "Veiculo" DROP CONSTRAINT "Veiculo_pkey",
ADD COLUMN     "capacidadeTanque" DOUBLE PRECISION,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "tipoCombustivel" "TipoCombustivel" NOT NULL DEFAULT 'DIESEL_S10',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD CONSTRAINT "Veiculo_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "Produto" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoProduto" NOT NULL,
    "unidadeMedida" TEXT NOT NULL DEFAULT 'Litro',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "matricula" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'OPERADOR',
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jornada" (
    "id" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),
    "kmInicio" DOUBLE PRECISION NOT NULL,
    "kmFim" DOUBLE PRECISION,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "operadorId" TEXT NOT NULL,
    "encarregadoId" TEXT NOT NULL,

    CONSTRAINT "Jornada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemAbastecimento" (
    "id" TEXT NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "valorPorUnidade" DOUBLE PRECISION NOT NULL,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "abastecimentoId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,

    CONSTRAINT "ItemAbastecimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fornecedor" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Produto_nome_key" ON "Produto"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "User_matricula_key" ON "User"("matricula");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Fornecedor_nome_key" ON "Fornecedor"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Fornecedor_cnpj_key" ON "Fornecedor"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Veiculo_placa_key" ON "Veiculo"("placa");

-- AddForeignKey
ALTER TABLE "Jornada" ADD CONSTRAINT "Jornada_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "Veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jornada" ADD CONSTRAINT "Jornada_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jornada" ADD CONSTRAINT "Jornada_encarregadoId_fkey" FOREIGN KEY ("encarregadoId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abastecimento" ADD CONSTRAINT "Abastecimento_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "Veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abastecimento" ADD CONSTRAINT "Abastecimento_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abastecimento" ADD CONSTRAINT "Abastecimento_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemAbastecimento" ADD CONSTRAINT "ItemAbastecimento_abastecimentoId_fkey" FOREIGN KEY ("abastecimentoId") REFERENCES "Abastecimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemAbastecimento" ADD CONSTRAINT "ItemAbastecimento_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
