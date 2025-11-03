/*
  Warnings:

  - You are about to drop the `claims` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `packets` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "claims" DROP CONSTRAINT "claims_packetId_fkey";

-- DropForeignKey
ALTER TABLE "claims" DROP CONSTRAINT "claims_userId_fkey";

-- DropForeignKey
ALTER TABLE "packets" DROP CONSTRAINT "packets_creatorId_fkey";

-- DropTable
DROP TABLE "claims";

-- DropTable
DROP TABLE "packets";
