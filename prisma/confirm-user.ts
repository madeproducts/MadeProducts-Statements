import { Pool } from "pg";
import "dotenv/config";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function main() {
  const pool = new Pool({ connectionString });
  console.log("Connecting to database to manually confirm user...");
  
  try {
    const result = await pool.query(`
      UPDATE auth.users 
      SET email_confirmed_at = NOW()
      WHERE email = 'madeproducts17@gmail.com'
      RETURNING id, email;
    `);

    if (result.rowCount && result.rowCount > 0) {
      console.log("✅ User 'madeproducts17@gmail.com' has been manually confirmed!");
    } else {
      console.log("User not found in auth.users. They might need to sign up first.");
    }
  } catch (error) {
    console.error("Failed to update user:", error);
  } finally {
    await pool.end();
  }
}

main();
