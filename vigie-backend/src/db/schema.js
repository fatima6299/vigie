import { pgTable, text, integer, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// --- TENANTS (les comptes clients — une PME = un tenant) ---
export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),              // ex: "Boutique Dakar SARL"
  plan: text('plan').notNull().default('decouverte'), // decouverte | pro | entreprise
  createdAt: text('created_at').notNull().default(sql`now()`)
});

// --- USERS (personnes qui se connectent, rattachées à un tenant) ---
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('admin'), // admin | membre
  phone: text('phone'),                            // pour les alertes WhatsApp/SMS
  createdAt: text('created_at').notNull().default(sql`now()`)
});

// --- SITES (ce qui est surveillé, toujours rattaché à un tenant) ---
export const sites = pgTable('sites', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  url: text('url').notNull(),
  status: text('status').notNull().default('en_attente'), // en_attente | up | down | lent
  responseTimeMs: integer('response_time_ms'),
  lastCheckAt: text('last_check_at'),
  uptimeChecksOk: integer('uptime_checks_ok').notNull().default(0),
  uptimeChecksTotal: integer('uptime_checks_total').notNull().default(0),
  checkIntervalSec: integer('check_interval_sec').notNull().default(60),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`now()`)
});

// --- CHECKS (historique détaillé de chaque vérification) ---
export const checks = pgTable('checks', {
  id: text('id').primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id),
  status: text('status').notNull(),
  responseTimeMs: integer('response_time_ms'),
  detail: text('detail'),
  checkedAt: text('checked_at').notNull().default(sql`now()`)
});

// --- ALERTS (notifications déclenchées) ---
export const alerts = pgTable('alerts', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  siteId: text('site_id').notNull().references(() => sites.id),
  siteName: text('site_name').notNull(),
  type: text('type').notNull(),      // panne | retour
  message: text('message').notNull(),
  channel: text('channel').notNull().default('whatsapp'), // whatsapp | sms | email
  sentAt: text('sent_at').notNull().default(sql`now()`)
});

// --- PAGE_VIEWS (visites collectées par le script de tracking embarqué) ---
export const pageViews = pgTable('page_views', {
  id: text('id').primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id),
  visitorId: text('visitor_id').notNull(), // identifiant anonyme stocké côté navigateur (localStorage)
  path: text('path').notNull(),
  referrer: text('referrer'),
  userAgent: text('user_agent'),
  viewedAt: text('viewed_at').notNull().default(sql`now()`)
});

// --- CLIENT_ERRORS (erreurs JavaScript rencontrées par les visiteurs) ---
export const clientErrors = pgTable('client_errors', {
  id: text('id').primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id),
  visitorId: text('visitor_id'),
  message: text('message').notNull(),
  stack: text('stack'),
  url: text('url'),
  userAgent: text('user_agent'),
  occurredAt: text('occurred_at').notNull().default(sql`now()`)
});
