CREATE TABLE "file_share" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp,
	"one_time" boolean DEFAULT false NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "file_share" ADD CONSTRAINT "file_share_file_id_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file"("id") ON DELETE cascade ON UPDATE no action;