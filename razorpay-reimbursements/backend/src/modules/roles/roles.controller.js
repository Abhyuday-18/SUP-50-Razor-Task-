const rolesService = require('./roles.service');
const { sendSuccess } = require('../../utils/responseHelper');

const assignRole = async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    const updatedUser = await rolesService.assignRole({ userId, role });
    return sendSuccess(res, updatedUser);
  } catch (error) {
    next(error);
  }
};

module.exports = { assignRole };
