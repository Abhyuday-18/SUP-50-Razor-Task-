const { pgTable, uuid, text, timestamp } = require('drizzle-orm/pg-core');

const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: text('role').notNull().default('EMP'),
  created_at: timestamp('created_at').defaultNow(),
});

module.exports = { users };
