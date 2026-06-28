/**
 * src/modules/policies/helpers.js
 *
 * Shared DB/audit utility functions used by all role policies.
 * Policies call these helpers instead of touching db directly,
 * so DB logic is centralised in one place.
 *
 * Prompted by: Policy/Strategy pattern refactor prompt (2026-06-28)
 */

const { eq, and, inArray } = require('drizzle-orm');
const db = require('../../config/db');
const {
  users,
  reimbursements,
  reimbursementApprovals,
  employeeManager,
} = require('../../db/schema');
const AppError = require('../../utils/AppError');

// ─── User helpers ─────────────────────────────────────────────────────────────

/**
 * Fetch a single user by ID.
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
async function getUser(userId) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return user || null;
}

// ─── Reimbursement helpers ────────────────────────────────────────────────────

/**
 * Fetch a single reimbursement by ID (full row).
 * @param {string} riId
 * @returns {Promise<object|null>}
 */
async function getReimbursement(riId) {
  const [ri] = await db
    .select()
    .from(reimbursements)
    .where(eq(reimbursements.id, riId));
  return ri || null;
}

/**
 * Apply a partial update to a reimbursement row.
 * @param {string} riId
 * @param {object} updates  e.g. { rm_approved: true, status: 'PENDING', updated_at: new Date() }
 */
async function updateReimbursementApproval(riId, updates) {
  await db
    .update(reimbursements)
    .set({ ...updates, updated_at: new Date() })
    .where(eq(reimbursements.id, riId));
}

/**
 * Insert an entry into reimbursement_approvals (audit log).
 * @param {string} riId
 * @param {string} approverId
 * @param {'RM'|'APE'|'CFO'} role
 * @param {'APPROVED'|'REJECTED'} decision
 */
async function logApproval(riId, approverId, role, decision) {
  await db.insert(reimbursementApprovals).values({
    reimbursement_id: riId,
    approver_id: approverId,
    approver_role: role,
    decision,
  });
}

/**
 * Given the current state of a RI after an approval flag is set,
 * determine whether it should now be marked APPROVED.
 * Both rm_approved AND ape_approved must be true.
 * @param {boolean} rmApproved
 * @param {boolean} apeApproved
 * @returns {'APPROVED'|'PENDING'}
 */
function checkDualGate(rmApproved, apeApproved) {
  return rmApproved && apeApproved ? 'APPROVED' : 'PENDING';
}

// ─── Employee-Manager helpers ─────────────────────────────────────────────────

/**
 * Check whether an EMP is assigned to a specific RM.
 * @param {string} empId
 * @param {string} rmId
 * @returns {Promise<boolean>}
 */
async function isEMPAssignedToRM(empId, rmId) {
  const [row] = await db
    .select()
    .from(employeeManager)
    .where(
      and(eq(employeeManager.emp_id, empId), eq(employeeManager.rm_id, rmId))
    );
  return !!row;
}

/**
 * Return all EMP rows that are assigned to a given RM.
 * @param {string} rmId
 * @returns {Promise<object[]>}
 */
async function getRMAssignedEmployees(rmId) {
  return db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(employeeManager)
    .innerJoin(users, eq(employeeManager.emp_id, users.id))
    .where(eq(employeeManager.rm_id, rmId));
}

/**
 * Return all reimbursements belonging to EMPs assigned to the given RM,
 * filtered to PENDING status (what RM needs to see in their queue).
 * @param {string} rmId
 * @returns {Promise<object[]>}
 */
async function getRMTeamReimbursements(rmId) {
  return db
    .select({
      reimbursementId: reimbursements.id,
      userId: reimbursements.emp_id,
      title: reimbursements.title,
      description: reimbursements.description,
      amount: reimbursements.amount,
      status: reimbursements.status,
    })
    .from(reimbursements)
    .innerJoin(employeeManager, eq(reimbursements.emp_id, employeeManager.emp_id))
    .where(
      and(
        eq(employeeManager.rm_id, rmId),
        eq(reimbursements.status, 'PENDING')
      )
    );
}

/**
 * Delete all employee_manager rows where this user is the RM.
 * Called when an RM is downgraded to a different role.
 * @param {string} rmId
 */
async function removeRMAssignments(rmId) {
  await db
    .delete(employeeManager)
    .where(eq(employeeManager.rm_id, rmId));
}

/**
 * Check whether an EMP already has any RM assignment.
 * @param {string} empId
 * @returns {Promise<boolean>}
 */
async function empHasManager(empId) {
  const [row] = await db
    .select()
    .from(employeeManager)
    .where(eq(employeeManager.emp_id, empId));
  return !!row;
}

/**
 * Insert a new employee_manager assignment row.
 * @param {string} empId
 * @param {string} rmId
 */
async function insertManagerAssignment(empId, rmId) {
  await db.insert(employeeManager).values({ emp_id: empId, rm_id: rmId });
}

/**
 * Delete a specific employee_manager assignment row.
 * @param {string} empId
 * @param {string} rmId
 */
async function deleteManagerAssignment(empId, rmId) {
  await db
    .delete(employeeManager)
    .where(
      and(eq(employeeManager.emp_id, empId), eq(employeeManager.rm_id, rmId))
    );
}

module.exports = {
  getUser,
  getReimbursement,
  updateReimbursementApproval,
  logApproval,
  checkDualGate,
  isEMPAssignedToRM,
  getRMAssignedEmployees,
  getRMTeamReimbursements,
  removeRMAssignments,
  empHasManager,
  insertManagerAssignment,
  deleteManagerAssignment,
};
