/**
 * src/modules/policies/EMPPolicy.js
 *
 * Defines ALL permissions and actions available to a user with role = 'EMP'.
 * EMPs can only manage their own reimbursements — they have no visibility into
 * other employees or the approval workflow.
 * Services must never contain EMP-specific if/else — they call these methods instead.
 *
 * Prompted by: Policy/Strategy pattern refactor prompt (2026-06-28)
 */

const AppError = require('../../utils/AppError');
const helpers = require('./helpers');
const { eq } = require('drizzle-orm');
const db = require('../../config/db');
const { reimbursements } = require('../../db/schema');

const EMPPolicy = {
  // ─── Employees module ──────────────────────────────────────────────────────

  /**
   * EMPs cannot view the employees list.
   * @throws {AppError} 403
   */
  canViewEmployees() {
    throw new AppError('Forbidden', 403);
  },

  /**
   * EMPs have no visible employee list — this should never be called,
   * but is defined for interface completeness.
   * @throws {AppError} 403
   */
  async getVisibleEmployees() {
    throw new AppError('Forbidden', 403);
  },

  // ─── Reimbursements module ─────────────────────────────────────────────────

  /**
   * Returns all RIs that belong to this EMP.
   * @param {string} callerId — the EMP's user ID
   * @returns {Promise<object[]>}
   */
  async getVisibleReimbursements(callerId) {
    return db
      .select({
        reimbursementId: reimbursements.id,
        title: reimbursements.title,
        description: reimbursements.description,
        amount: reimbursements.amount,
        status: reimbursements.status,
      })
      .from(reimbursements)
      .where(eq(reimbursements.emp_id, callerId));
  },

  /**
   * EMP can only view a RI if they own it.
   * @param {object} ri       — full reimbursement row
   * @param {string} callerId — the EMP's user ID
   * @returns {boolean}
   * @throws {AppError} 403 if RI does not belong to this EMP
   */
  canViewReimbursement(ri, callerId) {
    if (ri.emp_id !== callerId) {
      throw new AppError('Forbidden', 403);
    }
    return true;
  },

  /**
   * Validates inputs and inserts a new reimbursement for this EMP.
   * @param {string} title
   * @param {string} description
   * @param {number|string} amount
   * @param {string} empId
   * @returns {Promise<object>} the newly created RI
   */
  async createReimbursement(title, description, amount, empId) {
    if (
      !title ||
      description === undefined ||
      description === null ||
      amount === undefined ||
      amount === null
    ) {
      throw new AppError('Title, description, and amount are required', 400);
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new AppError('Amount must be a positive number', 400);
    }

    const [newRI] = await db
      .insert(reimbursements)
      .values({
        emp_id: empId,
        title,
        description,
        amount: String(parsedAmount),
        status: 'PENDING',
        rm_approved: false,
        ape_approved: false,
      })
      .returning({
        reimbursementId: reimbursements.id,
        title: reimbursements.title,
        description: reimbursements.description,
        amount: reimbursements.amount,
        status: reimbursements.status,
      });

    return newRI;
  },

  /**
   * EMPs cannot approve reimbursements.
   * @throws {AppError} 403
   */
  canApproveReimbursement() {
    throw new AppError('Forbidden', 403);
  },

  // ─── Roles module ─────────────────────────────────────────────────────────

  /**
   * EMPs cannot assign roles.
   * @throws {AppError} 403
   */
  canAssignRole() {
    throw new AppError('Forbidden', 403);
  },
};

module.exports = EMPPolicy;
