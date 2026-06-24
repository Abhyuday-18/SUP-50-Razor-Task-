require('dotenv').config();

const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const bcrypt = require('bcryptjs');
const { eq } = require('drizzle-orm');
const { users } = require('./schema/users');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Cannot seed.');
  process.exit(1);
}

async function seed() {
  const client = postgres(DATABASE_URL);
  const db = drizzle(client);

  try {
    // Check if CFO already exists
    const existing = await db.select().from(users).where(eq(users.email, 'cfo@org.com'));

    if (existing.length > 0) {
      console.log('CFO account already exists. Skipping seed.');
    } else {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('CFO#ORG@April2026', salt);

      await db.insert(users).values({
        name: 'CFO',
        email: 'cfo@org.com',
        password_hash: passwordHash,
        role: 'CFO',
      });

      console.log('CFO account seeded successfully.');
    }
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
