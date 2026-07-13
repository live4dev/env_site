CREATE TABLE "user_note_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"note_id" uuid NOT NULL,
	"saved" boolean DEFAULT false NOT NULL,
	"read_later" boolean DEFAULT false NOT NULL,
	"last_viewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_note_states" ADD CONSTRAINT "user_note_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_note_states" ADD CONSTRAINT "user_note_states_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_note_states_user_note_idx" ON "user_note_states" USING btree ("user_id","note_id");--> statement-breakpoint
CREATE INDEX "user_note_states_user_saved_idx" ON "user_note_states" USING btree ("user_id","saved");--> statement-breakpoint
CREATE INDEX "user_note_states_user_read_later_idx" ON "user_note_states" USING btree ("user_id","read_later");