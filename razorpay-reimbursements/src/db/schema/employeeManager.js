const { pgTable, uuid, timestamp } = require('drizzle-orm/pg-core');
const { users } = require('./users');

const employeeManager = pgTable('employee_manager', {
  id: uuid('id').primaryKey().defaultRandom(),
  emp_id: uuid('emp_id').references(() => users.id).notNull(),
  rm_id: uuid('rm_id').references(() => users.id).notNull(),
  assigned_at: timestamp('assigned_at').defaultNow(),
});

module.exports = { employeeManager };
