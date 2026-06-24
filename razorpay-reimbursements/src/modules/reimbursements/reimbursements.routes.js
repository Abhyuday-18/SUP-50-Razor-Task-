const express = require('express');
const router = express.Router();
const reimbursementsController = require('./reimbursements.controller');

// POST /rest/reimbursements
router.post('/', reimbursementsController.createReimbursement);

// PATCH /rest/reimbursements
router.patch('/', reimbursementsController.updateReimbursement);

// GET /rest/reimbursements
router.get('/', reimbursementsController.getReimbursements);

// GET /rest/reimbursements/:userId
router.get('/:userId', reimbursementsController.getReimbursementsByUser);

module.exports = router;
