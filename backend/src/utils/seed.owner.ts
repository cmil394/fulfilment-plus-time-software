import { hashPassword } from "./auth";
import { prisma } from "../lib/prisma";
import { config } from "dotenv";

config();

type OwnerSeed = {
  email: string;
  firstName: string;
  lastName: string;
};

const owners: OwnerSeed[] = [
  {
    email: "owner@gmail.com",
    firstName: "System",
    lastName: "Owner",
  },
  {
    email: "mike@fulfilmentplus.co.nz",
    firstName: "Mike",
    lastName: "Appleton",
  },
  {
    email: "carl@cargoplus.co.nz",
    firstName: "Carl",
    lastName: "Mills",
  },
  {
    email: "rob@cargoplus.co.nz",
    firstName: "Rob",
    lastName: "Mills",
  },
];

export const seedOwner = async () => {
  const ownerPassword = process.env.OWNER_PASSWORD;

  if (!ownerPassword) {
    console.warn("OWNER_PASSWORD not set");
    return;
  }

  const hashedPassword = await hashPassword(ownerPassword);

  let created = 0;

  for (let i = 0; i < owners.length; i++) {
    const owner = owners[i];

    const existing = await prisma.user.findUnique({
      where: { email: owner.email },
    });

    if (existing) {
      continue;
    }

    const employeeCode = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");

    const pin = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");

    const hashedPin = await hashPassword(pin);

    try {
      await prisma.user.create({
        data: {
          email: owner.email,
          password: hashedPassword,
          fullName: `${owner.firstName} ${owner.lastName}`,
          firstName: owner.firstName,
          lastName: owner.lastName,
          role: "Owner",
          status: "APPROVED",
          employeeCode,
          pin: hashedPin,
        },
      });

      console.log(
        `${owner.email} created — employeeCode: ${employeeCode}, pin: ${pin}`
      );
      created++;
    } catch (error: any) {
      if (error.code === "P2002") {
      } else {
        throw error;
      }
    }
  }

  if (created === 0) {
    console.log("Owners already exist");
  }
};
