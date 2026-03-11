/**
 * Create an admin user (email + password) in the database.
 * Usage: node scripts/create-admin.js <email> <password> [name]
 * Example: node scripts/create-admin.js admin@example.com MySecurePass123 "Admin User"
 *
 * Ensure .env has DATABASE_URL set. Run from project root.
 */

const path = require("path");
const fs = require("fs");

// Load .env from project root
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] || "Admin";

  if (!email || !password) {
    console.error("Usage: node scripts/create-admin.js <email> <password> [name]");
    console.error('Example: node scripts/create-admin.js admin@example.com MySecurePass123 "Admin User"');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Error: Password must be at least 8 characters.");
    process.exit(1);
  }

  const { PrismaClient } = require("@prisma/client");
  const bcrypt = require("bcrypt");

  const prisma = new PrismaClient();

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({
        where: { email },
        data: {
          role: "ADMIN",
          name: name || existing.name,
          password: await bcrypt.hash(password, 12),
          emailVerified: existing.emailVerified || new Date(),
        },
      });
      console.log("Updated existing user to ADMIN:", email);
    } else {
      const hashedPassword = await bcrypt.hash(password, 12);
      await prisma.user.create({
        data: {
          email,
          name: name || "Admin",
          password: hashedPassword,
          role: "ADMIN",
          emailVerified: new Date(),
        },
      });
      console.log("Admin user created:", email);
    }
    console.log("You can now log in at /login with this email and password.");
  } catch (e) {
    console.error("Error:", e.message);
    if (!process.env.DATABASE_URL) {
      console.error("Make sure .env exists and contains DATABASE_URL.");
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
