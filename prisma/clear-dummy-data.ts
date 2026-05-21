import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  console.log("Clearing all dummy data...");
  
  // Since we have cascading deletes, deleting clients will delete all related statements and payments
  const deletedClients = await db.client.deleteMany({});
  
  console.log(`✅ Successfully deleted ${deletedClients.count} clients (and their associated statements and payments).`);
  console.log("User profiles are kept intact.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
