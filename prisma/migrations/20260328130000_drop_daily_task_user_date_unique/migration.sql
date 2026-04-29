-- Multiple tasks per user per day: remove legacy unique on (userId, taskDate).
-- Safe on fresh DB (IF EXISTS prevents errors if table or constraint never existed).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'DailyTask') THEN
    ALTER TABLE "DailyTask" DROP CONSTRAINT IF EXISTS "DailyTask_userId_taskDate_key";
    DROP INDEX IF EXISTS "DailyTask_userId_taskDate_key";
  END IF;
END $$;
