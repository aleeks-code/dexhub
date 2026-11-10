-- A) Azzeramento dati di test, ordine FK figli -> padri
DELETE FROM "task_comments";
--> statement-breakpoint
DELETE FROM "task_subtasks";
--> statement-breakpoint
DELETE FROM "task_task_tags";
--> statement-breakpoint
DELETE FROM "task_tags";
--> statement-breakpoint
DELETE FROM "tasks";
--> statement-breakpoint
DELETE FROM "task_space_members";
--> statement-breakpoint
DELETE FROM "task_spaces";
--> statement-breakpoint

-- B) DROP strutturali
ALTER TABLE "task_lists" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "task_lists" CASCADE;--> statement-breakpoint
DROP INDEX "idx_tasks_list";--> statement-breakpoint
DROP INDEX "idx_tasks_sort";--> statement-breakpoint
CREATE INDEX "idx_tasks_sort" ON "tasks" USING btree ("space_id","sort_order");--> statement-breakpoint
ALTER TABLE "task_space_members" DROP COLUMN "last_seen_at";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "list_id";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "color";
--> statement-breakpoint

-- C) Backfill Personal Space incondizionato (1 per utente, tutti gli space azzerati in A)
WITH new_spaces AS (
  INSERT INTO "task_spaces" ("name", "type", "created_by")
  SELECT 'Personale', 'personal', "id" FROM "users"
  RETURNING "id", "created_by"
)
INSERT INTO "task_space_members" ("space_id", "user_id")
SELECT "id", "created_by" FROM new_spaces;
