import { hashPassword } from "./auth";
import { prisma } from "../lib/prisma";
import { config } from "dotenv";

config();

export const seedOwner = async () => {
  const ownerEmail = process.env.OWNER_EMAIL;
  const ownerPassword = process.env.OWNER_PASSWORD;

  if (!ownerEmail || !ownerPassword) {
    console.warn("OWNER_EMAIL / OWNER_PASSWORD not set");
    return;
  }

  const existingOwner = await prisma.user.findUnique({
    where: { email: ownerEmail },
  });

  if (existingOwner) {
    console.log("Owner already exists");
    return;
  }

  const hashedPassword = await hashPassword(ownerPassword);

  try {
    await prisma.user.create({
      data: {
        email: ownerEmail,
        password: hashedPassword,
        fullName: "System Owner",
        firstName: "System",
        lastName: "Owner",
        role: "Owner",
        status: "APPROVED",
      },
    });
    console.log("Owner account created");
  } catch (error: any) {
    if (error.code === "P2002") {
      console.log("Owner already exists");
    } else {
      throw error;
    }
  }
};

seedOwner()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
