/*
  Warnings:

  - You are about to alter the column `latitude` on the `contact_information` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `longitude` on the `contact_information` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to drop the column `category` on the `interests` table. All the data in the column will be lost.
  - You are about to drop the column `interest_vector` on the `people` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."interests_category_idx";

-- AlterTable
ALTER TABLE "public"."contact_information" ALTER COLUMN "latitude" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "longitude" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "public"."interests" DROP COLUMN "category";

-- AlterTable
ALTER TABLE "public"."people" DROP COLUMN "interest_vector";
