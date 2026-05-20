-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "baseline_due_date" DATE,
ADD COLUMN     "baseline_start_date" DATE;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_notifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notification_digest" TEXT NOT NULL DEFAULT 'off';
