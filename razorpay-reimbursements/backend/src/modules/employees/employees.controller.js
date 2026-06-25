const employeesService = require('./employees.service');
const { sendSuccess } = require('../../utils/responseHelper');

const getEmployees = async (req, res, next) => {
  try {
    const usersList = await employeesService.getEmployees(req.user.role, req.user.userId);
    return sendSuccess(res, { users: usersList });
  } catch (error) {
    next(error);
  }
};

const assignManager = async (req, res, next) => {
  try {
    const { empId, rmId } = req.body;
    const result = await employeesService.assignManager({ empId, rmId });
    return sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

const removeManager = async (req, res, next) => {
  try {
    const { empId, rmId } = req.body;
    const result = await employeesService.removeManager({ empId, rmId });
    return sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

module.exports = { getEmployees, assignManager, removeManager };
