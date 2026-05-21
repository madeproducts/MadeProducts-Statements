import { PrismaClient, Role, StatementStatus, PaymentMethod } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });


async function main() {
  console.log("🌱 Starting database seed...");

  // Clear existing data in dependency order
  await db.payment.deleteMany();
  await db.statement.deleteMany();
  await db.client.deleteMany();
  await db.userProfile.deleteMany();

  console.log("✅ Cleared existing data");

  // Create an admin user profile (requires a pre-existing Supabase user with this UUID)
  // In production, you'd sign up through the UI, but for seeding we create a placeholder profile
  // Users must be created through Supabase Auth first then seed creates the profile record
  // This seed only creates client/statement/payment demo data
  // Admin user is created on first login

  // Seed Clients
  const clients = await Promise.all([
    db.client.create({
      data: {
        name: "Suresh Mehta",
        companyName: "SteelCraft Industries Pvt Ltd",
        email: "billing@steelcraft.in",
        phone: "+91 98765 43210",
        address: "Plot 42, Naroda GIDC, Phase II",
        city: "Ahmedabad",
        country: "India",
      },
    }),
    db.client.create({
      data: {
        name: "Priya Sharma",
        companyName: "AutoTech Components Pvt Ltd",
        email: "accounts@autotech.co.in",
        phone: "+91 87654 32109",
        address: "Survey No. 15, Manjusar GIDC",
        city: "Vadodara",
        country: "India",
      },
    }),
    db.client.create({
      data: {
        name: "Rajan Patel",
        companyName: "Gujarat Forging Corporation",
        email: "finance@gujaratforging.com",
        phone: "+91 76543 21098",
        address: "B-12, Saijpur GIDC Industrial Estate",
        city: "Gandhinagar",
        country: "India",
      },
    }),
    db.client.create({
      data: {
        name: "Anil Kapoor",
        companyName: "Kapoor Metal Works",
        email: "accounts@kapoormetals.in",
        phone: "+91 65432 10987",
        address: "Unit 7, Vatva GIDC",
        city: "Ahmedabad",
        country: "India",
      },
    }),
    db.client.create({
      data: {
        name: "Meera Joshi",
        companyName: "Precision Engineering Works",
        email: "billing@precisionew.com",
        phone: "+91 54321 09876",
        address: "L-18, Bapunagar Industrial Area",
        city: "Surat",
        country: "India",
      },
    }),
  ]);

  console.log(`✅ Created ${clients.length} clients`);

  // Helper: random date within range
  const randomDate = (from: Date, to: Date) => {
    return new Date(from.getTime() + Math.random() * (to.getTime() - from.getTime()));
  };

  const past6Months = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
  const past1Month = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const future30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const past10Days = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

  // Seed Statements & Payments per client
  const statementData = [
    // SteelCraft Industries — 3 statements
    {
      clientId: clients[0].id,
      invoiceNumber: "INV/2024/001",
      productDetails: "CNC Machined Crankshafts (Grade EN24)",
      quantity: 50,
      billAmount: 125000,
      receivedAmount: 125000,
      balanceAmount: 0,
      status: StatementStatus.PAID,
      date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    },
    {
      clientId: clients[0].id,
      invoiceNumber: "INV/2024/002",
      productDetails: "Forged Connecting Rods (Heavy Duty 4x4)",
      quantity: 200,
      billAmount: 85000,
      receivedAmount: 42500,
      balanceAmount: 42500,
      status: StatementStatus.PARTIAL,
      date: future30Days,
    },
    {
      clientId: clients[0].id,
      invoiceNumber: "INV/2024/003",
      productDetails: "Precision Cylinder Liners (Bore 102mm)",
      quantity: 100,
      billAmount: 67500,
      receivedAmount: 0,
      balanceAmount: 67500,
      status: StatementStatus.OVERDUE,
      date: past10Days,
    },
    // AutoTech Components — 2 statements
    {
      clientId: clients[1].id,
      invoiceNumber: "INV/2024/004",
      productDetails: "Camshaft Assembly (DOHC Engine Parts)",
      quantity: 75,
      billAmount: 225000,
      receivedAmount: 225000,
      balanceAmount: 0,
      status: StatementStatus.PAID,
      date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    },
    {
      clientId: clients[1].id,
      invoiceNumber: "INV/2024/005",
      productDetails: "Rocker Arms and Pushrod Sets",
      quantity: 300,
      billAmount: 45000,
      receivedAmount: 0,
      balanceAmount: 45000,
      status: StatementStatus.PENDING,
      date: future30Days,
    },
    // Gujarat Forging — 2 statements
    {
      clientId: clients[2].id,
      invoiceNumber: "INV/2024/006",
      productDetails: "Heavy Duty Truck Axle Shafts (Grade 40Cr4)",
      quantity: 30,
      billAmount: 186000,
      receivedAmount: 100000,
      balanceAmount: 86000,
      status: StatementStatus.PARTIAL,
      date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    },
    {
      clientId: clients[2].id,
      invoiceNumber: "INV/2024/007",
      productDetails: "Bevel Gears (Differential Set — 16 Teeth)",
      quantity: 60,
      billAmount: 95000,
      receivedAmount: 0,
      balanceAmount: 95000,
      status: StatementStatus.OVERDUE,
      date: past10Days,
    },
    // Kapoor Metal Works — 1 statement
    {
      clientId: clients[3].id,
      invoiceNumber: "INV/2024/008",
      productDetails: "Industrial Hydraulic Cylinders (200mm stroke)",
      quantity: 20,
      billAmount: 320000,
      receivedAmount: 320000,
      balanceAmount: 0,
      status: StatementStatus.PAID,
      date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    },
    // Precision Engineering — 1 statement
    {
      clientId: clients[4].id,
      invoiceNumber: "INV/2024/009",
      productDetails: "Precision Spindle Bearings (Angular Contact 7205BE)",
      quantity: 500,
      billAmount: 72500,
      receivedAmount: 0,
      balanceAmount: 72500,
      status: StatementStatus.PENDING,
      date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    },
  ];

  const statements = await Promise.all(
    statementData.map((stmt) =>
      db.statement.create({
        data: {
          ...stmt,
          notes: null,
          invoiceUrl: null,
        },
      })
    )
  );

  console.log(`✅ Created ${statements.length} statements`);

  // Seed Payments for paid/partial statements
  const payments = await Promise.all([
    // Full payment for INV/2024/001
    db.payment.create({
      data: {
        clientId: statements[0].clientId,
        receivedAmount: 125000,
        date: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        referenceNumber: "UTR24001234567",
        notes: "Full settlement via RTGS",
      },
    }),
    // Partial payment for INV/2024/002
    db.payment.create({
      data: {
        clientId: statements[1].clientId,
        receivedAmount: 42500,
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        paymentMethod: PaymentMethod.UPI,
        referenceNumber: "UPI24STEELCRAFT001",
        notes: "50% advance payment via BHIM UPI",
      },
    }),
    // Full payment for INV/2024/004
    db.payment.create({
      data: {
        clientId: statements[3].clientId,
        receivedAmount: 225000,
        date: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000),
        paymentMethod: PaymentMethod.CHEQUE,
        referenceNumber: "CHQ-002345",
        notes: "HDFC Bank cheque clearance",
      },
    }),
    // Partial payment for INV/2024/006
    db.payment.create({
      data: {
        clientId: statements[5].clientId,
        receivedAmount: 100000,
        date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        referenceNumber: "NEFT24GFC000001",
        notes: "First installment received",
      },
    }),
    // Full payment for INV/2024/008
    db.payment.create({
      data: {
        clientId: statements[7].clientId,
        receivedAmount: 320000,
        date: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        referenceNumber: "RTGS24KMW000001",
        notes: "Full payment — RTGS confirmed",
      },
    }),
  ]);

  console.log(`✅ Created ${payments.length} payment records`);
  console.log("\n🎉 Database seeded successfully!");
  console.log("\n📊 Summary:");
  console.log(`   Clients: ${clients.length}`);
  console.log(`   Statements: ${statements.length}`);
  console.log(`   Payments: ${payments.length}`);
  console.log("\n🔑 Next Steps:");
  console.log("   1. Go to your Supabase project → Auth → Users");
  console.log("   2. Invite or create a user account");
  console.log("   3. Log in through the app at /login — a profile will be auto-created");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
