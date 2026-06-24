const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middlewares/errorHandler');

const authRoutes = require('./modules/auth/auth.routes');
const rolesRoutes = require('./modules/roles/roles.routes');
const employeesRoutes = require('./modules/employees/employees.routes');
const reimbursementsRoutes = require('./modules/reimbursements/reimbursements.routes');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json());

// Routes — all under /rest prefix
app.use('/rest/onboardings', authRoutes);
app.use('/rest/roles', rolesRoutes);
app.use('/rest/employees', employeesRoutes);
app.use('/rest/reimbursements', reimbursementsRoutes);

// Global error handler
app.use(errorHandler);

module.exports = app;
