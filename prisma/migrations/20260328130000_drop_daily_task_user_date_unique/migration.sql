-- Multiple tasks per user per day: remove legacy unique on (userId, taskDate).
ALTER TABLE "DailyTask" DROP CONSTRAINT IF EXISTS "DailyTask_userId_taskDate_key";
DROP INDEX IF EXISTS "DailyTask_userId_taskDate_key";
