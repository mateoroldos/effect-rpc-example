ALTER TABLE "agents" ADD COLUMN "organization_id" uuid NOT NULL;--> statement-breakpoint
CREATE INDEX "agents_organization_id_idx" ON "agents" ("organization_id");--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;