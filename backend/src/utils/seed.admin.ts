import { hashPassword } from "./auth";
import { prisma } from "../lib/prisma";
import { config } from "dotenv";

config();

export const seedAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.warn("ADMIN_EMAIL / ADMIN_PASSWORD not set");
    return;
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log("Admin already exists");
    return;
  }

  const hashedPassword = await hashPassword(adminPassword);

  await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      fullName: "System Administrator",
      firstName: "System",
      lastName: "Administrator",
      role: "ADMIN",
      status: "APPROVED",
    },
  });

  console.log("🔥 Admin account created");
};

seedAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());