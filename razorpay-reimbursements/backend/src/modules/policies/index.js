/**
 * src/modules/policies/index.js
 *
 * Central registry that maps role strings to their corresponding Policy object.
 *
 * Usage in any service:
 *   const policies = require('../policies');
 *   const policy = policies[callerRole];  // e.g. policies['RM'] → RMPolicy
 *   if (!policy) throw new AppError('Forbidden', 403);
 *
 * To add a new role:
 *   1. Create src/modules/policies/NewRolePolicy.js
 *   2. Add the entry here
 *   3. Done — no service files need to change.
 *
 * Prompted by: Policy/Strategy pattern refactor prompt (2026-06-28)
 */

const RMPolicy  = require('./RMPolicy');
const APEPolicy = require('./APEPolicy');
const CFOPolicy = require('./CFOPolicy');
const EMPPolicy = require('./EMPPolicy');

module.exports = {
  RM:  RMPolicy,
  APE: APEPolicy,
  CFO: CFOPolicy,
  EMP: EMPPolicy,
};
