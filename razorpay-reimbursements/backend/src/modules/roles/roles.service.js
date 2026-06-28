/**
 * src/modules/roles/roles.service.js
 *
 * Roles service — thin orchestrator that delegates all authorization
 * and business logic to CFOPolicy.
 *
 * Pattern: validate inputs → get policy → policy.can*() → policy.execute()
 * No if/else role checks live here.
 *
 * Refactored as part of: Policy/Strategy pattern refactor (2026-06-28)
 */

const policies = require('../policies');
const AppError = require('../../utils/AppError');

const assignRole = async ({ userId, role, callerRole }) => {
  // 1. Resolve the caller's policy
  const policy = policies[callerRole];
  if (!policy) throw new AppError('Forbidden', 403);

  // 2. Policy decides if this role is allowed to assign
  policy.canAssignRole(role);

  // 3. Policy executes the assignment (validates user, handles RM downgrade, updates DB)
  const updatedUser = await policy.assignRole(userId, role);

  return updatedUser;
};

module.exports = { assignRole };
