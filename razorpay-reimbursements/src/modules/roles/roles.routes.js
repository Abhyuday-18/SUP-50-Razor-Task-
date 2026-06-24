const express = require('express');
const router = express.Router();
const rolesController = require('./roles.controller');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');

// POST /rest/roles/assign — CFO only
router.post('/assign', authenticate, authorize(['CFO']), rolesController.assignRole);

module.exports = router;
