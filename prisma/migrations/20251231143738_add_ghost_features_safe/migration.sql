/*
  Warnings:

  - You are about to drop the column `cnhCategoria` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `cnhNumero` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `cnhValidade` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `dataAdmissao` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TipoVeiculo" AS ENUM ('POLIGUINDASTE', 'VACUO', 'CARRETA', 'UTILITARIO', 'CAMINHAO_PIPA', 'OUTRO');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'BOT';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "cnhCategoria",
DROP COLUMN "cnhNumero",
DROP COLUMN "cnhValidade",
DROP COLUMN "dataAdmissao";

-- CreateTable
CREATE TABLE "ColaboradorProfile" (
    "id" TEXT NOT NULL,
    "cnhNumero" TEXT,
    "cnhCategoria" TEXT,
    "cnhValidade" TIMESTAMP(3),
    "dataAdmissao" TIMESTAMP(3),
    "userId" TEXT NOT NULL,

    CONSTRAINT "ColaboradorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ColaboradorProfile_userId_key" ON "ColaboradorProfile"("userId");

-- AddForeignKey
ALTER TABLE "ColaboradorProfile" ADD CONSTRAINT "ColaboradorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
