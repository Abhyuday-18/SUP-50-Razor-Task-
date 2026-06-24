const { eq } = require('drizzle-orm');
const db = require('../../config/db');
const { users, employeeManager } = require('../../db/schema');
const AppError = require('../../utils/AppError');

const VALID_ASSIGNABLE_ROLES = ['EMP', 'RM', 'APE'];

const assignRole = async ({ userId, role }) => {
  // Block CFO assignment
  if (role === 'CFO') {
    throw new AppError('Cannot assign CFO role', 400);
  }

  // Validate role string
  if (!VALID_ASSIGNABLE_ROLES.includes(role)) {
    throw new AppError('Invalid role. Allowed roles: EMP, RM, APE', 400);
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!userId || !uuidRegex.test(userId)) {
    throw new AppError('Invalid userId format. Must be a valid UUID.', 400);
  }

  // Check if user exists
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check if user already has this role
  if (user.role === role) {
    throw new AppError('User already has this role', 400);
  }

  // Role downgrade logic: if user is currently RM and being changed, remove all their employee assignments
  if (user.role === 'RM') {
    await db.delete(employeeManager).where(eq(employeeManager.rm_id, userId));
  }

  // Update the user's role
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
};

module.exports = { assignRole };
