const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');

// POST /rest/onboardings/register
router.post('/register', authController.register);

// POST /rest/onboardings/login
router.post('/login', authController.login);

// POST /rest/onboardings/logout
router.post('/logout', authController.logout);

module.exports = router;
