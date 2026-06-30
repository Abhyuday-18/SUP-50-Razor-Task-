const { pgTable, uuid, text, numeric, boolean, timestamp } = require('drizzle-orm/pg-core');
const { users } = require('./users');

const reimbursements = pgTable('reimbursements', {
  id: uuid('id').primaryKey().defaultRandom(),
  emp_id: uuid('emp_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  amount: numeric('amount').notNull(),
  rm_approved: boolean('rm_approved').default(false),
  ape_approved: boolean('ape_approved').default(false),
  status: text('status').default('PENDING'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

module.exports = { reimbursements };