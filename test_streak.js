const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function test() {
  const userId = '4773695b-1e7f-47d9-8560-7747f8abfa68'; // test user
  const habitName = 'Test Habit ' + Math.random().toString(36).substring(7);

  console.log("Attempting to create streak for habit:", habitName);
  try {
    const streak = await prisma.streak.create({
      data: {
        userId,
        name: habitName,
        current: 0,
        best: 0,
        lastCheckin: new Date()
      }
    });
    console.log("Success! Created streak:", streak);
  } catch (error) {
    console.error("Streak creation failed with error:", error);
  } finally {
    await pool.end();
  }
}

test();
