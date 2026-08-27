import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("12345678", 10);
  
  // 1. Ensure Default Enterprise Organization
  const org = await prisma.organization.upsert({
    where: { id: "org_allsender_corp" },
    update: {},
    create: {
      id: "org_allsender_corp",
      name: "Organización Corporativa AllSender",
      rnc: "131-89241-2",
      currency: "DOP",
      plan: "ENTERPRISE",
      address: "Av. Winston Churchill #1099, Torre Citi, Piantini, Santo Domingo, D.N.",
      phone: "+1 (809) 567-8900",
      is_active: true
    }
  });

  // 2. Ensure CodeMorf IT Super Admin
  await prisma.user.upsert({
    where: { email: "it@codemorf.tech" },
    update: {
      password_hash: passwordHash,
      platform_role: "SUPER_ADMIN",
      role: "ADMIN",
      is_active: true
    },
    create: {
      id: "usr_codemorf_it_01",
      organization_id: org.id,
      name: "CodeMorf IT Admin",
      email: "it@codemorf.tech",
      password_hash: passwordHash,
      role: "ADMIN",
      platform_role: "SUPER_ADMIN",
      department: "Tecnología & Plataforma",
      status: "ACTIVE",
      is_active: true
    }
  });

  console.log("Database seeded successfully: it@codemorf.tech ready");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
