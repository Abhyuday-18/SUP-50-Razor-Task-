/**
 * src/modules/auth/auth.service.js
 *
 * Authentication service — register and login only.
 * This module is intentionally policy-agnostic: auth happens before a role is
 * known, so there are no role checks here. Logout is handled entirely in the
 * controller (clear cookie) and requires no service logic.
 *
 * Functions: register, login
 * Cleanup (2026-06-28): confirmed no dead code; 2 functions only.
 */

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { eq } = require('drizzle-orm');
const db     = require('../../config/db');
const env    = require('../../config/env');
const { users } = require('../../db/schema');
const AppError  = require('../../utils/AppError');

// ─── POST /rest/onboardings/register ─────────────────────────────────────────
const registerUser = async ({ name, email, password }) => {
  if (!email || !email.endsWith('@org.com')) {
    throw new AppError('Only @org.com emails are allowed', 400);
  }

  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing.length > 0) {
    throw new AppError('Email already exists', 400);
  }

  const salt         = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const [newUser] = await db
    .insert(users)
    .values({ name, email, password_hash: passwordHash })
    .returning({
      userId: users.id,
      name:   users.name,
      email:  users.email,
      role:   users.role,
    });

  return newUser;
};

// ─── POST /rest/onboardings/login ─────────────────────────────────────────────
const loginUser = async ({ email, password }) => {
  if (!email || !email.endsWith('@org.com')) {
    throw new AppError('Only @org.com emails are allowed', 400);
  }

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  return {
    token,
    user: {
      userId: user.id,
      name:   user.name,
      email:  user.email,
      role:   user.role,
    },
  };
};

module.exports = { registerUser, loginUser };
