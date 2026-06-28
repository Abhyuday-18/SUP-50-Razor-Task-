/**
 * src/modules/employees/employees.service.js
 *
 * Employees service — thin orchestrator. No raw DB queries. No role if/else.
 * All validation, DB operations, and authorization live in CFOPolicy (and helpers).
 *
 * Functions: getEmployees (3 lines), assignManager (5 lines), removeManager (5 lines)
 *
 * Pattern: validate UUID inputs → get policy → policy.can*() → policy.execute()
 *
 * Cleanup (2026-06-28): removed all raw DB queries; moved to CFOPolicy.
 */

const AppError  = require('../../utils/AppError');
const policies  = require('../policies');

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── GET /rest/employees ──────────────────────────────────────────────────────
const getEmployees = async (callerRole, callerId) => {
  const policy = policies[callerRole];
  if (!policy) throw new AppError('Forbidden', 403);

  policy.canViewEmployees();

  return policy.getVisibleEmployees(callerId);
};

// ─── POST /rest/employees/assign ─────────────────────────────────────────────
const assignManager = async ({ empId, rmId }) => {
  if (!empId || !uuidRegex.test(empId)) throw new AppError('Invalid empId format. Must be a valid UUID.', 400);
  if (!rmId  || !uuidRegex.test(rmId))  throw new AppError('Invalid rmId format. Must be a valid UUID.', 400);

  // Route is CFO-only; resolve CFO policy directly
  const policy = policies['CFO'];
  await policy.canAssignManager(empId, rmId);
  return policy.assignManager(empId, rmId);
};

// ─── DELETE /rest/employees/assign ───────────────────────────────────────────
const removeManager = async ({ empId, rmId }) => {
  if (!empId || !uuidRegex.test(empId)) throw new AppError('Invalid empId format. Must be a valid UUID.', 400);
  if (!rmId  || !uuidRegex.test(rmId))  throw new AppError('Invalid rmId format. Must be a valid UUID.', 400);

  // Route is CFO-only; resolve CFO policy directly
  const policy = policies['CFO'];
  await policy.canRemoveAssignment(empId, rmId);
  return policy.removeAssignment(empId, rmId);
};

module.exports = { getEmployees, assignManager, removeManager };
