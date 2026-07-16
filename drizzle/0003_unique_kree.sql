ALTER TABLE "notes" ADD COLUMN "public_share_token" text;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "public_shared_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "notes_public_share_token_idx" ON "notes" USING btree ("public_share_token");