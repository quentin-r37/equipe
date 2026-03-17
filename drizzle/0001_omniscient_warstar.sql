ALTER TABLE "file" DROP CONSTRAINT "file_channel_id_channel_id_fk";
--> statement-breakpoint
ALTER TABLE "file" DROP CONSTRAINT "file_message_id_message_id_fk";
--> statement-breakpoint
ALTER TABLE "file" ADD CONSTRAINT "file_channel_id_channel_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file" ADD CONSTRAINT "file_message_id_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."message"("id") ON DELETE cascade ON UPDATE no action;