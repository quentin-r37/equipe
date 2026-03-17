import { pgTable, text, integer, timestamp, serial } from 'drizzle-orm/pg-core';

// ── Legacy demo table ──────────────────────────────────────────────
export const task = pgTable('task', {
	id: serial('id').primaryKey(),
	title: text('title').notNull(),
	priority: integer('priority').notNull().default(1)
});

// ── Teams ──────────────────────────────────────────────────────────
export const team = pgTable('team', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	description: text('description').default(''),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	createdBy: text('created_by').notNull()
});

export const teamMember = pgTable('team_member', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	teamId: text('team_id')
		.notNull()
		.references(() => team.id, { onDelete: 'cascade' }),
	userId: text('user_id').notNull(),
	role: text('role').notNull().default('member'), // 'owner' | 'admin' | 'member'
	joinedAt: timestamp('joined_at').defaultNow().notNull()
});

// ── Channels ───────────────────────────────────────────────────────
export const channel = pgTable('channel', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	teamId: text('team_id')
		.notNull()
		.references(() => team.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description').default(''),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	createdBy: text('created_by').notNull()
});

// ── Messages ───────────────────────────────────────────────────────
export const message = pgTable('message', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	channelId: text('channel_id')
		.notNull()
		.references(() => channel.id, { onDelete: 'cascade' }),
	userId: text('user_id').notNull(),
	userName: text('user_name').notNull(),
	content: text('content').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

// ── Meetings ───────────────────────────────────────────────────────
export const meeting = pgTable('meeting', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	teamId: text('team_id')
		.notNull()
		.references(() => team.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	status: text('status').notNull().default('active'), // 'active' | 'ended'
	createdAt: timestamp('created_at').defaultNow().notNull(),
	createdBy: text('created_by').notNull()
});

// ── Files ──────────────────────────────────────────────────────────
export const file = pgTable('file', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	teamId: text('team_id')
		.notNull()
		.references(() => team.id, { onDelete: 'cascade' }),
	channelId: text('channel_id').references(() => channel.id, { onDelete: 'cascade' }),
	messageId: text('message_id').references(() => message.id, { onDelete: 'cascade' }),
	userId: text('user_id').notNull(),
	userName: text('user_name').notNull(),
	name: text('name').notNull(),
	size: integer('size').notNull(),
	mimeType: text('mime_type').notNull(),
	storagePath: text('storage_path').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export * from './auth.schema';
