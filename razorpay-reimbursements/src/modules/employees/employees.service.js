const { eq, and, inArray } = require('drizzle-orm');
const db = require('../../config/db');
const { users, employeeManager } = require('../../db/schema');
const AppError = require('../../utils/AppError');

const getEmployees = async (callerRole, callerId) => {
  if (callerRole === 'EMP') {
    throw new AppError('Forbidden', 403);
  }

  let result = [];

  if (callerRole === 'RM') {
    // RM sees only EMPs assigned to them
    const assignments = await db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(employeeManager)
      .innerJoin(users, eq(employeeManager.emp_id, users.id))
      .where(eq(employeeManager.rm_id, callerId));

    result = assignments;
  } else if (callerRole === 'APE') {
    // APE sees all EMPs and RMs
    result = await db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(inArray(users.role, ['EMP', 'RM']));
  } else if (callerRole === 'CFO') {
    // CFO sees everyone
    result = await db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users);
  }

  return result;
};

const assignManager = async ({ empId, rmId }) => {
  // Same user check
  if (empId === rmId) {
    throw new AppError('Employee and manager cannot be the same user', 400);
  }

  // Validate emp exists and has role EMP
  const [emp] = await db.select().from(users).where(eq(users.id, empId));
  if (!emp) {
    throw new AppError('Employee not found', 404);
  }
  if (emp.role !== 'EMP') {
    throw new AppError('User with empId does not have role EMP', 400);
  }

  // Validate rm exists and has role RM
  const [rm] = await db.select().from(users).where(eq(users.id, rmId));
  if (!rm) {
    throw new AppError('Manager not found', 404);
  }
  if (rm.role !== 'RM') {
    throw new AppError('User with rmId does not have role RM', 400);
  }

  // Check if EMP is already assigned to any RM
  const [existingAssignment] = await db
    .select()
    .from(employeeManager)
    .where(eq(employeeManager.emp_id, empId));

  if (existingAssignment) {
    throw new AppError('Employee is already assigned to a reporting manager', 400);
  }

  // Insert assignment
  await db.insert(employeeManager).values({
    emp_id: empId,
    rm_id: rmId,
  });

  return { message: 'Employee assigned successfully' };
};

const removeManager = async ({ empId, rmId }) => {
  // Validate emp exists and has role EMP
  const [emp] = await db.select().from(users).where(eq(users.id, empId));
  if (!emp) {
    throw new AppError('Employee not found', 404);
  }
  if (emp.role !== 'EMP') {
    throw new AppError('User with empId does not have role EMP', 400);
  }

  // Validate rm exists and has role RM
  const [rm] = await db.select().from(users).where(eq(users.id, rmId));
  if (!rm) {
    throw new AppError('Manager not found', 404);
  }
  if (rm.role !== 'RM') {
    throw new AppError('User with rmId does not have role RM', 400);
  }

  // Check if assignment exists
  const [assignment] = await db
    .select()
    .from(employeeManager)
    .where(
      and(
        eq(employeeManager.emp_id, empId),
        eq(employeeManager.rm_id, rmId)
      )
    );

  if (!assignment) {
    throw new AppError('Assignment not found', 404);
  }

  // Delete the assignment
  await db
    .delete(employeeManager)
    .where(
      and(
        eq(employeeManager.emp_id, empId),
        eq(employeeManager.rm_id, rmId)
      )
    );

  return { message: 'Assignment removed successfully' };
};

module.exports = { getEmployees, assignManager, removeManager };
