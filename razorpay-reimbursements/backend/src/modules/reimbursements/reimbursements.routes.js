const express = require('express');
const router = express.Router();
const reimbursementsController = require('./reimbursements.controller');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');

// POST /rest/reimbursements — EMP only
router.post('/', authenticate, authorize(['EMP']), reimbursementsController.createReimbursement);

// PATCH /rest/reimbursements — RM, APE, CFO (EMP blocked)
router.patch('/', authenticate, authorize(['RM', 'APE', 'CFO']), reimbursementsController.updateReimbursement);

// GET /rest/reimbursements — all roles (visibility handled in service)
router.get('/', authenticate, authorize(['EMP', 'RM', 'APE', 'CFO']), reimbursementsController.getReimbursements);

// GET /rest/reimbursements/:userId — RM, APE, CFO (EMP blocked)
router.get('/:userId', authenticate, authorize(['RM', 'APE', 'CFO']), reimbursementsController.getReimbursementsByUser);

module.exports = router;
