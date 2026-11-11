ALTER TABLE IF EXISTS "invite_requests" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
