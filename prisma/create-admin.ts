import { createClient } from "@supabase/supabase-js";
import { PrismaClient, Role } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  console.log("Creating admin user...");
  
  const email = "madeproducts17@gmail.com";
  const password = "Abhin2004#";
  
  // Try sign in first to see if the user exists
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    if (signInError.message.includes("Invalid login credentials")) {
      console.log("User does not exist, attempting to create...");
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: "Admin" },
        },
      });
      if (signUpError) {
        console.error("Supabase Auth Error:", signUpError.message);
        process.exit(1);
      }
      console.log("User created! Note: if email confirmations are enabled, they must verify.");
      // Note: we can't get the user ID if email is unconfirmed via anon key easily
      process.exit(0);
    } else {
      console.error("Sign In Error:", signInError.message);
      process.exit(1);
    }
  }

  const user = signInData.user;
  if (!user) {
    console.error("No user returned");
    process.exit(1);
  }

  // Ensure profile exists in our database
  const profile = await db.userProfile.findUnique({
    where: { id: user.id },
  });

  if (!profile) {
    console.log("Creating user profile in database...");
    await db.userProfile.create({
      data: {
        id: user.id,
        email: user.email!,
        name: "Admin",
        role: Role.ADMIN,
      },
    });
    console.log("Profile created!");
  } else {
    console.log("Profile already exists.");
  }
  
  console.log("✅ Admin user setup complete! You can now log in.");
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
