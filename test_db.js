const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
console.log("Connection string is:", connectionString);

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function test() {
  console.log("Attempting query...");
  try {
    const users = await prisma.user.findMany({ take: 1 });
    console.log("Success! Query returned:", users);
  } catch (error) {
    console.error("Query failed with error:", error);
  } finally {
    await pool.end();
  }
}

test();
