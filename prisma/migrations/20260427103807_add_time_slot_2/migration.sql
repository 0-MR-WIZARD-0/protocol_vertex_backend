/*
  Warnings:

  - A unique constraint covering the columns `[goalId,date,timeSlot]` on the table `GoalLog` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "GoalLog_goalId_date_key";

-- AlterTable
ALTER TABLE "GoalLog" ALTER COLUMN "timeSlot" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "GoalLog_goalId_date_timeSlot_key" ON "GoalLog"("goalId", "date", "timeSlot");
