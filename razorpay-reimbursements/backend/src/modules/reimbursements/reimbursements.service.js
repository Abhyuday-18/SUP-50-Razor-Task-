
const { eq } = require('drizzle-orm');
const db      = require('../../config/db');
const { users, reimbursements } = require('../../db/schema');
const AppError  = require('../../utils/AppError');
const policies  = require('../policies');
const helpers   = require('../policies/helpers');

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── POST /rest/reimbursements ────────────────────────────────────────────────
const createReimbursement = async ({ title, description, amount, empId }) => {
  // Route is EMP-only; resolve EMP policy directly
  return policies['EMP'].createReimbursement(title, description, amount, empId);
};

// ─── PATCH /rest/reimbursements ───────────────────────────────────────────────
const updateReimbursement = async ({ userId, reimbursementId, status, callerId, callerRole }) => {
  // 1. Validate inputs
  if (!reimbursementId) throw new AppError('reimbursementId is required', 400);
  if (!userId)          throw new AppError('userId is required', 400);
  if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
    throw new AppError('status must be APPROVED or REJECTED', 400);
  }
  if (!uuidRegex.test(reimbursementId)) throw new AppError('Invalid reimbursementId format', 400);
  if (!uuidRegex.test(userId))          throw new AppError('Invalid userId format', 400);

  // 2. Fetch the RI
  const ri = await helpers.getReimbursement(reimbursementId);
  if (!ri)                throw new AppError('Reimbursement not found', 404);
  if (ri.emp_id !== userId) throw new AppError('Reimbursement does not belong to this user', 400);

  // 3. Universal pre-check: already-rejected guard (applies to all roles)
  if (ri.status === 'REJECTED') {
    throw new AppError('Reimbursement has already been rejected', 400);
  }

  // 4. Resolve policy
  const policy = policies[callerRole];
  if (!policy) throw new AppError('Forbidden', 403);

  // 5. Policy checks permission (throws if forbidden)
  await policy.canApproveReimbursement(ri, callerId, status);

  // 6. Policy executes update + audit log
  await policy.approveReimbursement(ri, callerId, status);

  return { message: 'Reimbursement status updated' };
};

// ─── GET /rest/reimbursements ─────────────────────────────────────────────────
const getReimbursements = async ({ callerRole, callerId }) => {
  const policy = policies[callerRole];
  if (!policy) throw new AppError('Forbidden', 403);

  return policy.getVisibleReimbursements(callerId);
};

// ─── GET /rest/reimbursements/:userId ─────────────────────────────────────────
const getReimbursementsByUser = async ({ targetUserId, callerRole, callerId }) => {
  // 1. Validate UUID format
  if (!targetUserId || !uuidRegex.test(targetUserId)) {
    throw new AppError('Invalid userId format', 400);
  }

  // 2. Verify target user exists and is an EMP (structural pre-condition)
  const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId));
  if (!targetUser)               throw new AppError('User not found', 404);
  if (targetUser.role !== 'EMP') throw new AppError('Target user is not an employee', 400);

  // 3. Resolve policy
  const policy = policies[callerRole];
  if (!policy) throw new AppError('Forbidden', 403);

  // 4. Policy checks whether this caller can see this EMP's RIs
  //    (RM: only if EMP is assigned to them; APE/CFO: always)
  await policy.canViewReimbursement({ emp_id: targetUserId, rm_approved: true }, callerId);

  // 5. Fetch all RIs for the target EMP
  return db
    .select({
      reimbursementId: reimbursements.id,
      title:           reimbursements.title,
      description:     reimbursements.description,
      amount:          reimbursements.amount,
      status:          reimbursements.status,
    })
    .from(reimbursements)
    .where(eq(reimbursements.emp_id, targetUserId));
};

module.exports = { createReimbursement, updateReimbursement, getReimbursements, getReimbursementsByUser };
