import { prisma } from "../lib/prisma";
import { config } from "dotenv";

config();

export const seedCompany = async () => {
  const existingCompany = await prisma.customer.findFirst({
    where: { name: "Fulfilment Plus" },
  });

  if (existingCompany) {
    console.log("Company already exists");
    return;
  }

  try {
    await prisma.customer.create({
      data: {
        name: "Fulfilment Plus",
        ownerName: "Mike Appleton",
        email: "mikeappleton@fulfilmentplus.co.nz",
        phone: "+1234567890",
        avatarUrl: null,
        tasks: {
          create: [
            {
              name: "Break",
            },
            {
              name: "Meeting",
            }
          ],
        },
      },
    });
    console.log("Company created");
  } catch (error: any) {
    if (error.code === "P2002") {
      console.log("Company already exists");
    } else {
      throw error;
    }
  }
};

seedCompany()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
