-- AlterTable
ALTER TABLE "Task" ADD COLUMN "lastReminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "NotificationPreference" DROP COLUMN IF EXISTS "weeklyDigest";
