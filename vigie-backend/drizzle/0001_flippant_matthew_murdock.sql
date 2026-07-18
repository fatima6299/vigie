CREATE TABLE "client_errors" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"visitor_id" text,
	"message" text NOT NULL,
	"stack" text,
	"url" text,
	"user_agent" text,
	"occurred_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_views" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"visitor_id" text NOT NULL,
	"path" text NOT NULL,
	"referrer" text,
	"user_agent" text,
	"viewed_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_errors" ADD CONSTRAINT "client_errors_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;