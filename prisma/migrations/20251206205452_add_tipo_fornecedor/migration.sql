/*
  Warnings:

  - You are about to drop the column `loginTokenExpiresAt` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TipoFornecedor" AS ENUM ('POSTO', 'OFICINA', 'OUTROS');

-- AlterTable
ALTER TABLE "Fornecedor" ADD COLUMN     "tipo" "TipoFornecedor" NOT NULL DEFAULT 'OUTROS';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "loginTokenExpiresAt";
