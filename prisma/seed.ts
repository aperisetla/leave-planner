/**
 * Seed script – loads the real AFI team (28 members).
 * Clears all existing sample data first, then inserts the real roster.
 * Run: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Full AFI India team roster
// Email uses employee-ID format; update to real emails once available.
// Names are formatted as "First Last" from the "Last, First" HR export.
const TEAM: { empId: string; name: string; role: string }[] = [
  { empId: "200013", name: "Bhavya Reddy Boddum",                  role: "Engineer" },
  { empId: "200059", name: "Sairam Suresh Kumar",                  role: "Engineer" },
  { empId: "200072", name: "Amith Perisetla",                      role: "TPM"      },
  { empId: "200078", name: "Gaurav Vijay Patil",                   role: "Engineer" },
  { empId: "200087", name: "Shaktirupa Dash",                      role: "Engineer" },
  { empId: "200089", name: "Mohd Kabir Ansari",                    role: "Engineer" },
  { empId: "200103", name: "Divya Bharathi Jayakanthan",           role: "Engineer" },
  { empId: "200113", name: "Ashutosh Kumar",                       role: "Engineer" },
  { empId: "200116", name: "Sathiya Narayanan Kothandaraman",      role: "Engineer" },
  { empId: "200175", name: "Sagar Gautam Kudale",                  role: "Engineer" },
  { empId: "200271", name: "Sridharan Kannan",                     role: "Engineer" },
  { empId: "200286", name: "Gowtham Arivumani",                    role: "Engineer" },
  { empId: "200289", name: "Priyanka Purushothaman",               role: "Engineer" },
  { empId: "200293", name: "Sivanantham Viswanathan",              role: "Engineer" },
  { empId: "200294", name: "Dharani Balakrishnan",                 role: "Engineer" },
  { empId: "200332", name: "Thiyagarajan Selvamuthukumaran",       role: "Engineer" },
  { empId: "200365", name: "Abdul Salik Asaf Ali",                 role: "Engineer" },
  { empId: "200366", name: "Arshathul Syed Sharuk Nazeer Ahamed", role: "Engineer" },
  { empId: "200367", name: "Shamsheer Shaik",                      role: "Engineer" },
  { empId: "200368", name: "Nithya Bharathi Lackshmanan",          role: "Engineer" },
  { empId: "200403", name: "Kokila Suresh",                        role: "Engineer" },
  { empId: "200404", name: "Hariguruprasadh Ragothaman",           role: "Engineer" },
  { empId: "200405", name: "Pallav Anand",                         role: "Engineer" },
  { empId: "200414", name: "Pricilla Dorathy David Prem Kumar",    role: "Engineer" },
  { empId: "200421", name: "Manjupriya Raghupathi",                role: "Engineer" },
  { empId: "200495", name: "Akshatha Gopalakrishnan",              role: "Engineer" },
  { empId: "200518", name: "Vasanth Gopi",                         role: "Engineer" },
  { empId: "200708", name: "Karthick Rajendran",                   role: "Engineer" },
  { empId: "TBD",    name: "Rahul Jegannath Sabanayakam",          role: "Engineer" }, // update empId once known
];

async function main() {
  console.log("🧹 Clearing existing sample data…");
  await prisma.leaveEntry.deleteMany({});
  await prisma.teamMember.deleteMany({});

  console.log(`👥 Seeding ${TEAM.length} team members…`);
  for (const m of TEAM) {
    await prisma.teamMember.create({
      data: {
        name:   m.name,
        email:  `${m.empId}@ashleyfurnitureindia.com`,
        team:   "AFI India",
        role:   m.role,
        isActive: true,
      },
    });
    console.log(`  ✓ ${m.name} (${m.empId})`);
  }

  console.log(`\n✅ Seed complete — ${TEAM.length} members loaded.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
