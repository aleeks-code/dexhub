ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "pinned" boolean NOT NULL DEFAULT false;
ALTER TABLE "task_lists" ADD COLUMN IF NOT EXISTS "is_inbox" boolean NOT NULL DEFAULT false;
