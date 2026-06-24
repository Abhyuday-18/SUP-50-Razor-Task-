const { pgTable, uuid, text, timestamp } = require('drizzle-orm/pg-core');
const { reimbursements } = require('./reimbursements');
const { users } = require('./users');

const reimbursementApprovals = pgTable('reimbursement_approvals', {
  id: uuid('id').primaryKey().defaultRandom(),
  reimbursement_id: uuid('reimbursement_id').references(() => reimbursements.id).notNull(),
  approver_id: uuid('approver_id').references(() => users.id).notNull(),
  approver_role: text('approver_role').notNull(),
  decision: text('decision').notNull(),
  decided_at: timestamp('decided_at').defaultNow(),
});

module.exports = { reimbursementApprovals };
