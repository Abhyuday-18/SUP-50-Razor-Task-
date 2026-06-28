/**
 * src/modules/policies/CFOPolicy.js
 *
 * Defines ALL permissions and actions available to a user with role = 'CFO'.
 * The CFO has the broadest access: can see all users, all RIs, assign roles,
 * and fill either approval gate on behalf of RM or APE.
 * Services must never contain CFO-specific if/else — they call these methods instead.
 *
 * Prompted by: Policy/Strategy pattern refactor prompt (2026-06-28)
 */

const { eq, inArray } = require('drizzle-orm');
const db = require('../../config/db');
const { users, reimbursements, employeeManager } = require('../../db/schema');
const AppError = require('../../utils/AppError');
const helpers = require('./helpers');

const CFOPolicy = {
  // ─── Employees module ──────────────────────────────────────────────────────

  /**
   * CFO can always view employees.
   */
  canViewEmployees() {
    return true;
  },

  /**
   * CFO sees ALL users in the system.
   * @returns {Promise<object[]>}
   */
  async getVisibleEmployees() {
    return db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users);
  },

  /**
   * CFO can assign an EMP to an RM.
   * Validates that emp exists with role EMP, rm exists with role RM,
   * EMP is not the same user as RM, and EMP is not already assigned.
   * @param {string} empId
   * @param {string} rmId
   */
  async canAssignManager(empId, rmId) {
    if (empId === rmId) {
      throw new AppError('Employee and manager cannot be the same user', 400);
    }

    const emp = await helpers.getUser(empId);
    if (!emp) throw new AppError('Employee not found', 404);
    if (emp.role !== 'EMP') throw new AppError('User with empId does not have role EMP', 400);

    const rm = await helpers.getUser(rmId);
    if (!rm) throw new AppError('Manager not found', 404);
    if (rm.role !== 'RM') throw new AppError('User with rmId does not have role RM', 400);

    const alreadyAssigned = await helpers.empHasManager(empId);
    if (alreadyAssigned) {
      throw new AppError('Employee is already assigned to a reporting manager', 400);
    }
  },

  /**
   * Executes the EMP → RM assignment.
   * Assumes canAssignManager() already passed.
   * @param {string} empId
   * @param {string} rmId
   * @returns {{ message: string }}
   */
  async assignManager(empId, rmId) {
    await helpers.insertManagerAssignment(empId, rmId);
    return { message: 'Employee assigned successfully' };
  },

  /**
   * CFO can remove an EMP→RM assignment.
   * Validates both users exist with correct roles and assignment exists.
   * @param {string} empId
   * @param {string} rmId
   */
  async canRemoveAssignment(empId, rmId) {
    const emp = await helpers.getUser(empId);
    if (!emp) throw new AppError('Employee not found', 404);
    if (emp.role !== 'EMP') throw new AppError('User with empId does not have role EMP', 400);

    const rm = await helpers.getUser(rmId);
    if (!rm) throw new AppError('Manager not found', 404);
    if (rm.role !== 'RM') throw new AppError('User with rmId does not have role RM', 400);

    const assigned = await helpers.isEMPAssignedToRM(empId, rmId);
    if (!assigned) throw new AppError('Assignment not found', 404);
  },

  /**
   * Executes the EMP→RM assignment removal.
   * Assumes canRemoveAssignment() already passed.
   * @param {string} empId
   * @param {string} rmId
   * @returns {{ message: string }}
   */
  async removeAssignment(empId, rmId) {
    await helpers.deleteManagerAssignment(empId, rmId);
    return { message: 'Assignment removed successfully' };
  },

  // ─── Reimbursements module ─────────────────────────────────────────────────

  /**
   * CFO can view reimbursements.
   */
  canViewReimbursements() {
    return true;
  },

  /**
   * CFO sees APPROVED and REJECTED RIs for audit purposes.
   * @returns {Promise<object[]>}
   */
  async getVisibleReimbursements() {
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
      .where(inArray(reimbursements.status, ['APPROVED', 'REJECTED']));
  },

  /**
   * CFO can view any reimbursement regardless of its state.
   * @returns {boolean}
   */
  canViewReimbursement() {
    return true;
  },

  /**
   * Validates whether the CFO is allowed to act on this RI.
   * CFO can only act on PENDING RIs (cannot operate on already-REJECTED ones).
   *
   * @param {object} ri     — full reimbursement row
   * @param {string} status — 'APPROVED' or 'REJECTED'
   */
  async canApproveReimbursement(ri, _callerId, status) {
    if (ri.status === 'REJECTED') {
      throw new AppError('No actionable reimbursement found for this user', 404);
    }
    if (ri.status !== 'PENDING') {
      throw new AppError('No actionable reimbursement found for this user', 404);
    }
  },

  /**
   * Executes the CFO approval/rejection against the DB.
   * CFO can fill the RM gate or APE gate (whichever is missing).
   * Assumes canApproveReimbursement() already passed.
   *
   * @param {object} ri       — full reimbursement row
   * @param {string} callerId — the CFO's user ID
   * @param {string} status   — 'APPROVED' or 'REJECTED'
   */
  async approveReimbursement(ri, callerId, status) {
    if (status === 'REJECTED') {
      await helpers.updateReimbursementApproval(ri.id, { status: 'REJECTED' });
    } else {
      // Determine which gate is still missing and fill it
      let newRmApproved = ri.rm_approved;
      let newApeApproved = ri.ape_approved;

      if (!ri.rm_approved) {
        newRmApproved = true;
      } else if (!ri.ape_approved) {
        newApeApproved = true;
      }

      const newStatus = helpers.checkDualGate(newRmApproved, newApeApproved);
      await helpers.updateReimbursementApproval(ri.id, {
        rm_approved: newRmApproved,
        ape_approved: newApeApproved,
        status: newStatus,
      });
    }

    await helpers.logApproval(ri.id, callerId, 'CFO', status);
  },

  // ─── Roles module ─────────────────────────────────────────────────────────

  /**
   * CFO can assign any role except 'CFO' (there can only be one CFO seat).
   * @param {string} targetRole — the role being assigned
   * @throws {AppError} 400 if targetRole is 'CFO'
   */
  canAssignRole(targetRole) {
    if (targetRole === 'CFO') {
      throw new AppError('Cannot assign CFO role', 400);
    }
    return true;
  },

  /**
   * Executes the role assignment:
   *  1. Validates user exists and is not already the same role
   *  2. If demoting an RM, removes all their employee_manager rows
   *  3. Updates the user's role
   *
   * @param {string} userId — the target user's ID
   * @param {string} role   — the new role to assign
   * @returns {Promise<object>} updated user row
   */
  async assignRole(userId, role) {
    const VALID_ASSIGNABLE_ROLES = ['EMP', 'RM', 'APE'];

    if (!VALID_ASSIGNABLE_ROLES.includes(role)) {
      throw new AppError('Invalid role. Allowed roles: EMP, RM, APE', 400);
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!userId || !uuidRegex.test(userId)) {
      throw new AppError('Invalid userId format. Must be a valid UUID.', 400);
    }

    const user = await helpers.getUser(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.role === role) {
      throw new AppError('User already has this role', 400);
    }

    // If demoting an RM, clean up all their assignments
    if (user.role === 'RM') {
      await helpers.removeRMAssignments(userId);
    }

    const [updatedUser] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, userId))
      .returning({
        userId: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      });

    return updatedUser;
  },
};

module.exports = CFOPolicy;
