const express = require('express');
const router = express.Router();
const employeesController = require('./employees.controller');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');

// GET /rest/employees — RM, APE, CFO only (EMP blocked)
router.get('/', authenticate, authorize(['RM', 'APE', 'CFO']), employeesController.getEmployees);

// POST /rest/employees/assign — CFO only
router.post('/assign', authenticate, authorize(['CFO']), employeesController.assignManager);

// DELETE /rest/employees/assign — CFO only
router.delete('/assign', authenticate, authorize(['CFO']), employeesController.removeManager);

module.exports = router;
