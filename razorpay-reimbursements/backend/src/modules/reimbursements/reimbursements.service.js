const { eq, and, inArray } = require('drizzle-orm');
const db = require('../../config/db');
const { users, reimbursements, reimbursementApprovals, employeeManager } = require('../../db/schema');
const AppError = require('../../utils/AppError');

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── POST /rest/reimbursements ───────────────────────────────────────────────
const createReimbursement = async ({ title, description, amount, empId }) => {
  if (!title || description === undefined || description === null || amount === undefined || amount === null) {
    throw new AppError('Title, description, and amount are required', 400);
  }

  const parsedAmount = Number(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new AppError('Amount must be a positive number', 400);
  }

  const [newRI] = await db.insert(reimbursements).values({
    emp_id: empId,
    title,
    description,
    amount: String(parsedAmount),
    status: 'PENDING',
    rm_approved: false,
    ape_approved: false,
  }).returning({
    reimbursementId: reimbursements.id,
    title: reimbursements.title,
    description: reimbursements.description,
    amount: reimbursements.amount,
    status: reimbursements.status,
  });

  return newRI;
};

// ─── PATCH /rest/reimbursements ──────────────────────────────────────────────
const updateReimbursement = async ({ userId, reimbursementId, status, callerId, callerRole }) => {
  // ─── Upfront validations (all 6 checks before any role logic) ───────────
  if (!reimbursementId) {
    throw new AppError('reimbursementId is required', 400);
  }
  if (!userId) {
    throw new AppError('userId is required', 400);
  }
  if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
    throw new AppError('status must be APPROVED or REJECTED', 400);
  }

  // Validate UUID formats
  if (!uuidRegex.test(reimbursementId)) {
    throw new AppError('Invalid reimbursementId format', 400);
  }
  if (!uuidRegex.test(userId)) {
    throw new AppError('Invalid userId format', 400);
  }

  // Look up the specific reimbursement by its ID
  const [ri] = await db.select().from(reimbursements).where(eq(reimbursements.id, reimbursementId));
  if (!ri) {
    throw new AppError('Reimbursement not found', 404);
  }

  // Validate that the RI belongs to the provided userId
  if (ri.emp_id !== userId) {
    throw new AppError('Reimbursement does not belong to this user', 400);
  }

  // Check if already rejected
  if (ri.status === 'REJECTED') {
    throw new AppError('Reimbursement has already been rejected', 400);
  }

  // ─── RM logic ────────────────────────────────────────────────────────────
  if (callerRole === 'RM') {
    // Verify EMP is assigned to this RM
    const [assignment] = await db.select().from(employeeManager).where(
      and(eq(employeeManager.emp_id, userId), eq(employeeManager.rm_id, callerId))
    );
    if (!assignment) {
      throw new AppError('You are not the reporting manager for this employee', 403);
    }

    if (status === 'APPROVED' && ri.rm_approved) {
      throw new AppError('You have already approved this reimbursement', 400);
    }

    // RM can only act if rm_approved is still false and status is PENDING
    if (ri.rm_approved || ri.status !== 'PENDING') {
      throw new AppError('No actionable reimbursement found for this user', 404);
    }

    if (status === 'REJECTED') {
      await db.update(reimbursements)
        .set({ status: 'REJECTED', updated_at: new Date() })
        .where(eq(reimbursements.id, ri.id));
    } else {
      // APPROVED by RM
      const newStatus = ri.ape_approved ? 'APPROVED' : 'PENDING';
      await db.update(reimbursements)
        .set({ rm_approved: true, status: newStatus, updated_at: new Date() })
        .where(eq(reimbursements.id, ri.id));
    }

    // Insert audit log
    await db.insert(reimbursementApprovals).values({
      reimbursement_id: ri.id,
      approver_id: callerId,
      approver_role: 'RM',
      decision: status,
    });

    return { message: 'Reimbursement status updated' };
  }

  // ─── APE logic ───────────────────────────────────────────────────────────
  if (callerRole === 'APE') {
    if (status === 'APPROVED' && ri.ape_approved) {
      throw new AppError('You have already approved this reimbursement', 400);
    }

    // APE can only act if rm_approved = true, ape_approved = false, status = PENDING
    if (!ri.rm_approved || ri.ape_approved || ri.status !== 'PENDING') {
      throw new AppError('No actionable reimbursement found for this user', 404);
    }

    if (status === 'REJECTED') {
      await db.update(reimbursements)
        .set({ status: 'REJECTED', updated_at: new Date() })
        .where(eq(reimbursements.id, ri.id));
    } else {
      // APPROVED by APE — since rm_approved is already true, status becomes APPROVED
      const newStatus = ri.rm_approved ? 'APPROVED' : 'PENDING';
      await db.update(reimbursements)
        .set({ ape_approved: true, status: newStatus, updated_at: new Date() })
        .where(eq(reimbursements.id, ri.id));
    }

    // Insert audit log
    await db.insert(reimbursementApprovals).values({
      reimbursement_id: ri.id,
      approver_id: callerId,
      approver_role: 'APE',
      decision: status,
    });

    return { message: 'Reimbursement status updated' };
  }

  // ─── CFO logic ───────────────────────────────────────────────────────────
  if (callerRole === 'CFO') {
    // CFO can only act on PENDING RIs
    if (ri.status !== 'PENDING') {
      throw new AppError('No actionable reimbursement found for this user', 404);
    }

    if (status === 'REJECTED') {
      await db.update(reimbursements)
        .set({ status: 'REJECTED', updated_at: new Date() })
        .where(eq(reimbursements.id, ri.id));

      await db.insert(reimbursementApprovals).values({
        reimbursement_id: ri.id,
        approver_id: callerId,
        approver_role: 'CFO',
        decision: 'REJECTED',
      });

      return { message: 'Reimbursement status updated' };
    }

    // APPROVED — determine which gate to fill
    if (!ri.rm_approved) {
      // CFO fills the RM gate
      const newStatus = ri.ape_approved ? 'APPROVED' : 'PENDING';
      await db.update(reimbursements)
        .set({ rm_approved: true, status: newStatus, updated_at: new Date() })
        .where(eq(reimbursements.id, ri.id));
    } else if (!ri.ape_approved) {
      // CFO fills the APE gate
      const newStatus = ri.rm_approved ? 'APPROVED' : 'PENDING';
      await db.update(reimbursements)
        .set({ ape_approved: true, status: newStatus, updated_at: new Date() })
        .where(eq(reimbursements.id, ri.id));
    }

    await db.insert(reimbursementApprovals).values({
      reimbursement_id: ri.id,
      approver_id: callerId,
      approver_role: 'CFO',
      decision: 'APPROVED',
    });

    return { message: 'Reimbursement status updated' };
  }

  throw new AppError('Forbidden', 403);
};

// ─── GET /rest/reimbursements ────────────────────────────────────────────────
const getReimbursements = async ({ callerRole, callerId }) => {
  let result = [];

  if (callerRole === 'EMP') {
    // EMP sees all their own RIs
    result = await db.select({
      reimbursementId: reimbursements.id,
      title: reimbursements.title,
      description: reimbursements.description,
      amount: reimbursements.amount,
      status: reimbursements.status,
    }).from(reimbursements).where(eq(reimbursements.emp_id, callerId));

  } else if (callerRole === 'RM') {
    // RM sees PENDING RIs from EMPs assigned to them
    result = await db.select({
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
          eq(employeeManager.rm_id, callerId),
          eq(reimbursements.status, 'PENDING')
        )
      );

  } else if (callerRole === 'APE') {
    // APE sees RIs where rm_approved = true AND status = PENDING
    result = await db.select({
      reimbursementId: reimbursements.id,
      userId: reimbursements.emp_id,
      title: reimbursements.title,
      description: reimbursements.description,
      amount: reimbursements.amount,
      status: reimbursements.status,
    }).from(reimbursements).where(
      and(
        eq(reimbursements.rm_approved, true),
        eq(reimbursements.status, 'PENDING')
      )
    );

  } else if (callerRole === 'CFO') {
    // CFO sees APPROVED and REJECTED RIs for audit
    result = await db.select({
      reimbursementId: reimbursements.id,
      userId: reimbursements.emp_id,
      title: reimbursements.title,
      description: reimbursements.description,
      amount: reimbursements.amount,
      status: reimbursements.status,
    }).from(reimbursements).where(
      inArray(reimbursements.status, ['APPROVED', 'REJECTED'])
    );
  }

  return result;
};

// ─── GET /rest/reimbursements/:userId ────────────────────────────────────────
const getReimbursementsByUser = async ({ targetUserId, callerRole, callerId }) => {
  // Validate UUID format
  if (!targetUserId || !uuidRegex.test(targetUserId)) {
    throw new AppError('Invalid userId format', 400);
  }

  // Verify target user exists and is an EMP
  const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId));
  if (!targetUser) {
    throw new AppError('User not found', 404);
  }
  if (targetUser.role !== 'EMP') {
    throw new AppError('Target user is not an employee', 400);
  }

  // RM can only view if the EMP is assigned to them
  if (callerRole === 'RM') {
    const [assignment] = await db.select().from(employeeManager).where(
      and(eq(employeeManager.emp_id, targetUserId), eq(employeeManager.rm_id, callerId))
    );
    if (!assignment) {
      throw new AppError('This employee is not under your management', 403);
    }
  }

  // Fetch all RIs for the target EMP
  const result = await db.select({
    reimbursementId: reimbursements.id,
    title: reimbursements.title,
    description: reimbursements.description,
    amount: reimbursements.amount,
    status: reimbursements.status,
  }).from(reimbursements).where(eq(reimbursements.emp_id, targetUserId));

  return result;
};

module.exports = { createReimbursement, updateReimbursement, getReimbursements, getReimbursementsByUser };
