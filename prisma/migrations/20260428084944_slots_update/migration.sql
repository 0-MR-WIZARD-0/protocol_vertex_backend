/*
  Warnings:

  - You are about to drop the column `timesPerDay` on the `Goal` table. All the data in the column will be lost.

*/
-- AlterTable

ALTER TABLE "Goal" DROP COLUMN "timesPerDay",
ADD COLUMN     "slots" TEXT[];

UPDATE "Goal"
SET "slots" = ARRAY['day']; -- дефолт для старых данных

-- ALTER TABLE "Goal" DROP COLUMN "timesPerDay";