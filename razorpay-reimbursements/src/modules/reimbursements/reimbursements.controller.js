const reimbursementsService = require('./reimbursements.service');
const { sendSuccess } = require('../../utils/responseHelper');

// POST /rest/reimbursements — EMP only
const createReimbursement = async (req, res, next) => {
  try {
    const { title, description, amount } = req.body;
    const result = await reimbursementsService.createReimbursement({
      title,
      description,
      amount,
      empId: req.user.userId,
    });
    return sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
};

// PATCH /rest/reimbursements — RM, APE, CFO
const updateReimbursement = async (req, res, next) => {
  try {
    const { userId, reimbursementId, status } = req.body;
    const result = await reimbursementsService.updateReimbursement({
      userId,
      reimbursementId,
      status,
      callerId: req.user.userId,
      callerRole: req.user.role,
    });
    return sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

// GET /rest/reimbursements — all roles, visibility differs
const getReimbursements = async (req, res, next) => {
  try {
    const result = await reimbursementsService.getReimbursements({
      callerRole: req.user.role,
      callerId: req.user.userId,
    });
    return sendSuccess(res, { reimbursements: result });
  } catch (error) {
    next(error);
  }
};

// GET /rest/reimbursements/:userId — RM, APE, CFO only
const getReimbursementsByUser = async (req, res, next) => {
  try {
    const result = await reimbursementsService.getReimbursementsByUser({
      targetUserId: req.params.userId,
      callerRole: req.user.role,
      callerId: req.user.userId,
    });
    return sendSuccess(res, { reimbursements: result });
  } catch (error) {
    next(error);
  }
};

module.exports = { createReimbursement, updateReimbursement, getReimbursements, getReimbursementsByUser };
