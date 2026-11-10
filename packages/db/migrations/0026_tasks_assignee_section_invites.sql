CREATE TYPE "public"."task_section" AS ENUM('oggi', 'settimana', 'prossime');--> statement-breakpoint
CREATE TABLE "task_space_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"invited_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_space_invite_email" UNIQUE("space_id","email")
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "section" "task_section" DEFAULT 'oggi' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "assignee_id" text;--> statement-breakpoint
ALTER TABLE "task_space_invites" ADD CONSTRAINT "task_space_invites_space_id_task_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."task_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_space_invites" ADD CONSTRAINT "task_space_invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_space_invites_space" ON "task_space_invites" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "idx_space_invites_email" ON "task_space_invites" USING btree ("email");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tasks_assignee" ON "tasks" USING btree ("assignee_id");