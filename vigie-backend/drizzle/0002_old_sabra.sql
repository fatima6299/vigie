ALTER TABLE "alerts" DROP CONSTRAINT "alerts_site_id_sites_id_fk";
--> statement-breakpoint
ALTER TABLE "checks" DROP CONSTRAINT "checks_site_id_sites_id_fk";
--> statement-breakpoint
ALTER TABLE "client_errors" DROP CONSTRAINT "client_errors_site_id_sites_id_fk";
--> statement-breakpoint
ALTER TABLE "page_views" DROP CONSTRAINT "page_views_site_id_sites_id_fk";
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checks" ADD CONSTRAINT "checks_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_errors" ADD CONSTRAINT "client_errors_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;