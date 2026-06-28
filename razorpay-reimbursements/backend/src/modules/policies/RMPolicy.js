/**
 * src/modules/policies/RMPolicy.js
 *
 * Defines ALL permissions and actions available to a user with role = 'RM'.
 * Services must never contain RM-specific if/else — they call these methods instead.
 *
 * Prompted by: Policy/Strategy pattern refactor prompt (2026-06-28)
 */

const { eq, and, inArray } = require('drizzle-orm');
const db = require('../../config/db');
const { users } = require('../../db/schema');
const AppError = require('../../utils/AppError');
const helpers = require('./helpers');

const RMPolicy = {
  // ─── Employees module ──────────────────────────────────────────────────────

  /**
   * RM can always view employees (their own team).
   */
  canViewEmployees() {
    return true;
  },

  /**
   * Returns only the EMPs that are assigned to this RM.
   * @param {string} callerId  — the RM's user ID
   * @returns {Promise<object[]>}
   */
  async getVisibleEmployees(callerId) {
    return helpers.getRMAssignedEmployees(callerId);
  },

  // ─── Reimbursements module ─────────────────────────────────────────────────

  /**
   * RM can view reimbursements (their team's queue).
   */
  canViewReimbursements() {
    return true;
  },

  /**
   * Returns all PENDING RIs from EMPs assigned to this RM.
   * @param {string} callerId  — the RM's user ID
   * @returns {Promise<object[]>}
   */
  async getVisibleReimbursements(callerId) {
    return helpers.getRMTeamReimbursements(callerId);
  },

  /**
   * RM can view a specific RI only if the EMP belongs to their team.
   * @param {object} ri       — full reimbursement row
   * @param {string} callerId — the RM's user ID
   * @returns {Promise<boolean>}
   * @throws {AppError} 403 if EMP is not under this RM
   */
  async canViewReimbursement(ri, callerId) {
    const assigned = await helpers.isEMPAssignedToRM(ri.emp_id, callerId);
    if (!assigned) {
      throw new AppError('This employee is not under your management', 403);
    }
    return true;
  },

  /**
   * Validates whether this RM is allowed to approve/reject the given RI.
   * Throws an AppError if any check fails.
   *
   * Checks:
   *  1. EMP must be assigned to this RM
   *  2. RI must still be actionable (rm_approved = false, status = PENDING)
   *  3. RM has not already approved (idempotency guard)
   *
   * @param {object} ri       — full reimbursement row
   * @param {string} callerId — the RM's user ID
   * @param {string} status   — 'APPROVED' or 'REJECTED'
   */
  async canApproveReimbursement(ri, callerId, status) {
    const assigned = await helpers.isEMPAssignedToRM(ri.emp_id, callerId);
    if (!assigned) {
      throw new AppError('You are not the reporting manager for this employee', 403);
    }

    if (status === 'APPROVED' && ri.rm_approved) {
      throw new AppError('You have already approved this reimbursement', 400);
    }

    if (ri.rm_approved || ri.status !== 'PENDING') {
      throw new AppError('No actionable reimbursement found for this user', 404);
    }
  },

  /**
   * Executes the RM approval/rejection against the DB.
   * Assumes canApproveReimbursement() already passed.
   *
   * @param {object} ri       — full reimbursement row
   * @param {string} callerId — the RM's user ID
   * @param {string} status   — 'APPROVED' or 'REJECTED'
   */
  async approveReimbursement(ri, callerId, status) {
    if (status === 'REJECTED') {
      await helpers.updateReimbursementApproval(ri.id, { status: 'REJECTED' });
    } else {
      // Set rm_approved = true; check dual gate
      const newStatus = helpers.checkDualGate(true, ri.ape_approved);
      await helpers.updateReimbursementApproval(ri.id, {
        rm_approved: true,
        status: newStatus,
      });
    }

    await helpers.logApproval(ri.id, callerId, 'RM', status);
  },

  // ─── Roles module ─────────────────────────────────────────────────────────

  /**
   * RM cannot assign roles.
   * @throws {AppError} 403
   */
  canAssignRole() {
    throw new AppError('Forbidden', 403);
  },
};

module.exports = RMPolicy;
