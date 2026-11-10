CREATE TABLE "user_module_preferences" (
	"user_id" text NOT NULL,
	"module_id" varchar(50) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_module_preferences_user_id_module_id_pk" PRIMARY KEY("user_id","module_id")
);
--> statement-breakpoint
ALTER TABLE "user_module_preferences" ADD CONSTRAINT "user_module_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_module_preferences" ADD CONSTRAINT "user_module_preferences_module_id_module_registry_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."module_registry"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "user_module_preferences" (user_id, module_id, enabled)
SELECT u.id, m.id, true
FROM "users" u
CROSS JOIN "module_registry" m
WHERE m.status = 'active'
ON CONFLICT (user_id, module_id) DO NOTHING;