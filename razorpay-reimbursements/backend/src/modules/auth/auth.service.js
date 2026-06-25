const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { eq } = require('drizzle-orm');
const db = require('../../config/db');
const env = require('../../config/env');
const { users } = require('../../db/schema');
const AppError = require('../../utils/AppError');

const registerUser = async ({ name, email, password }) => {
  // Validate @org.com email
  if (!email || !email.endsWith('@org.com')) {
    throw new AppError('Only @org.com emails are allowed', 400);
  }

  // Check if email already exists
  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing.length > 0) {
    throw new AppError('Email already exists', 400);
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Insert user — role defaults to EMP via schema
  const [newUser] = await db.insert(users).values({
    name,
    email,
    password_hash: passwordHash,
  }).returning({
    userId: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
  });

  return newUser;
};

const loginUser = async ({ email, password }) => {
  // Validate @org.com email
  if (!email || !email.endsWith('@org.com')) {
    throw new AppError('Only @org.com emails are allowed', 400);
  }

  // Find user by email
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Verify password
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  // Sign JWT
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  return {
    token,
    user: {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

module.exports = { registerUser, loginUser };
