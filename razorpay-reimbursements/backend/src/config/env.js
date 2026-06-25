require('dotenv').config();

const { DATABASE_URL, JWT_SECRET, PORT } = process.env;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables. Server cannot start.');
}

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables. Server cannot start.');
}

module.exports = {
  DATABASE_URL,
  JWT_SECRET,
  PORT: PORT || 7002,
};
