/**
 * src/modules/policies/APEPolicy.js
 *
 * Defines ALL permissions and actions available to a user with role = 'APE'
 * (Accounts Payable Executive).
 * Services must never contain APE-specific if/else — they call these methods instead.
 *
 * Prompted by: Policy/Strategy pattern refactor prompt (2026-06-28)
 */

const { eq, and, inArray } = require('drizzle-orm');
const db = require('../../config/db');
const { users, reimbursements } = require('../../db/schema');
const AppError = require('../../utils/AppError');
const helpers = require('./helpers');

const APEPolicy = {
  // ─── Employees module ──────────────────────────────────────────────────────

  /**
   * APE can always view employees.
   */
  canViewEmployees() {
    return true;
  },

  /**
   * APE sees all users with role EMP or RM.
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
      .from(users)
      .where(inArray(users.role, ['EMP', 'RM']));
  },

  // ─── Reimbursements module ─────────────────────────────────────────────────

  /**
   * APE can view reimbursements.
   */
  canViewReimbursements() {
    return true;
  },

  /**
   * APE sees RIs where rm_approved = true AND status = PENDING.
   * These are the ones ready for APE review.
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
      .where(
        and(
          eq(reimbursements.rm_approved, true),
          eq(reimbursements.status, 'PENDING')
        )
      );
  },

  /**
   * APE can view a specific RI only if rm_approved = true.
   * @param {object} ri — full reimbursement row
   * @returns {boolean}
   * @throws {AppError} 403 if rm not yet approved
   */
  canViewReimbursement(ri) {
    if (!ri.rm_approved) {
      throw new AppError('Reimbursement not yet approved by RM', 403);
    }
    return true;
  },

  /**
   * Validates whether the APE is allowed to approve/reject this RI.
   * Checks:
   *  1. rm_approved must be true (RM gate must be passed)
   *  2. ape_approved must still be false (idempotency guard)
   *  3. status must still be PENDING
   *
   * @param {object} ri       — full reimbursement row
   * @param {string} callerId — the APE's user ID
   * @param {string} status   — 'APPROVED' or 'REJECTED'
   */
  async canApproveReimbursement(ri, callerId, status) {
    if (!ri.rm_approved || ri.ape_approved || ri.status !== 'PENDING') {
      throw new AppError('No actionable reimbursement found for this user', 404);
    }

    if (status === 'APPROVED' && ri.ape_approved) {
      throw new AppError('You have already approved this reimbursement', 400);
    }
  },

  /**
   * Executes the APE approval/rejection against the DB.
   * Assumes canApproveReimbursement() already passed.
   *
   * @param {object} ri       — full reimbursement row
   * @param {string} callerId — the APE's user ID
   * @param {string} status   — 'APPROVED' or 'REJECTED'
   */
  async approveReimbursement(ri, callerId, status) {
    if (status === 'REJECTED') {
      await helpers.updateReimbursementApproval(ri.id, { status: 'REJECTED' });
    } else {
      // Set ape_approved = true; check dual gate (rm_approved is already true)
      const newStatus = helpers.checkDualGate(ri.rm_approved, true);
      await helpers.updateReimbursementApproval(ri.id, {
        ape_approved: true,
        status: newStatus,
      });
    }

    await helpers.logApproval(ri.id, callerId, 'APE', status);
  },

  // ─── Roles module ─────────────────────────────────────────────────────────

  /**
   * APE cannot assign roles.
   * @throws {AppError} 403
   */
  canAssignRole() {
    throw new AppError('Forbidden', 403);
  },
};

module.exports = APEPolicy;
