/**
 * One-off: add a single team member without wiping existing data.
 * Usage: npx tsx scripts/add-member.ts
 */
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), ".env.local") });

const prisma = new PrismaClient({ log: [] });

async function main() {
  const name  = "Rahul Jegannath Sabanayakam";
  const email = "TBD@ashleyfurnitureindia.com"; // update with real empId when known

  const exists = await prisma.teamMember.findFirst({ where: { name } });
  if (exists) {
    console.log(`ℹ️  Already exists: ${exists.name} (${exists.id})`);
    return;
  }

  const member = await prisma.teamMember.create({
    data: {
      name,
      email,
      team:     "AFI India",
      role:     "Engineer",
      isActive: true,
    },
  });

  console.log(`✅ Created: ${member.name} — DB id: ${member.id}`);
  console.log(`   ⚠️  Email is a placeholder. Update it once you have Rahul's employee ID:`);
  console.log(`   UPDATE team_members SET email = '<empId>@ashleyfurnitureindia.com' WHERE id = '${member.id}';`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
