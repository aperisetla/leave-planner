/**
 * Bulk import: AFI India team April 2026 leave data
 * Run: npx tsx scripts/import-april-2026.ts
 *
 * Leave type mapping:  PL → PTO | SL → SICK | ML → MATERNITY_PATERNITY | blank → OTHER
 * Holiday:  April 14 → PUBLIC_HOLIDAY for all 28 active members
 * ⚠  Sabanayakam, Rahul Jegannath is in the source sheet but NOT in the DB — skipped.
 */

import { PrismaClient } from "@prisma/client";
import path from "path";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.local") });

const prisma = new PrismaClient({ log: [] });

// April 2026  (month index 3 = April, JS Date is 0-based)
const d = (day: number) => new Date(2026, 3, day);

type LT = "PTO" | "SICK" | "MATERNITY_PATERNITY" | "OTHER";
type LS = "APPROVED" | "PENDING";
interface Row { id: string; s: number; e: number; t: LT; st: LS; note?: string }

const LEAVES: Row[] = [
  // ── Sairam Suresh Kumar (PL)
  { id: "200059", s: 10, e: 10, t: "PTO",                st: "APPROVED" },
  { id: "200059", s: 29, e: 30, t: "PTO",                st: "APPROVED" },
  // ── Amith Perisetla (PL)
  { id: "200072", s: 29, e: 30, t: "PTO",                st: "APPROVED" },
  // ── Shaktirupa Dash (PL)
  { id: "200087", s:  1, e:  1, t: "PTO",                st: "APPROVED" },
  { id: "200087", s: 13, e: 13, t: "PTO",                st: "APPROVED" },
  // ── Divya Bharathi Jayakanthan (type not specified)
  { id: "200103", s:  3, e:  3, t: "OTHER",              st: "APPROVED" },
  // ── Sridharan Kannan (PL)
  { id: "200271", s:  2, e:  3, t: "PTO",                st: "APPROVED" },
  // ── Priyanka Purushothaman (ML – full month, no specific dates given)
  { id: "200289", s:  1, e: 30, t: "MATERNITY_PATERNITY",st: "APPROVED", note: "Maternity Leave" },
  // ── Sivanantham Viswanathan (PL – no status given → PENDING)
  { id: "200293", s:  1, e:  1, t: "PTO",                st: "PENDING"  },
  { id: "200293", s:  8, e:  8, t: "PTO",                st: "PENDING"  },
  // ── Dharani Balakrishnan (SL)
  { id: "200294", s:  6, e:  6, t: "SICK",               st: "APPROVED" },
  // ── Thiyagarajan Selvamuthukumaran (PL)
  { id: "200332", s:  6, e:  6, t: "PTO",                st: "APPROVED" },
  // ── Abdul Salik Asaf Ali (PL)
  { id: "200365", s:  6, e:  6, t: "PTO",                st: "APPROVED" },
  // ── Arshathul Syed Sharuk Nazeer Ahamed (PL)
  { id: "200366", s: 30, e: 30, t: "PTO",                st: "APPROVED" },
  // ── Shamsheer Shaik (type & status not specified → OTHER / PENDING)
  { id: "200367", s: 13, e: 13, t: "OTHER",              st: "PENDING"  },
  // ── Kokila Suresh (type not specified)
  { id: "200403", s:  2, e:  3, t: "OTHER",              st: "APPROVED" },
  { id: "200403", s: 27, e: 28, t: "OTHER",              st: "APPROVED" },
  // ── Hariguruprasadh Ragothaman (type not specified)
  { id: "200404", s: 16, e: 16, t: "OTHER",              st: "APPROVED" },
  { id: "200404", s: 28, e: 29, t: "OTHER",              st: "APPROVED" },
  // ── Pallav Anand (type not specified)
  { id: "200405", s:  8, e: 10, t: "OTHER",              st: "APPROVED" },
  // ── Pricilla Dorathy David Prem Kumar (type not specified)
  { id: "200414", s:  3, e:  3, t: "OTHER",              st: "APPROVED" },
  { id: "200414", s:  8, e:  8, t: "OTHER",              st: "APPROVED" },
  // ── Manjupriya Raghupathi (ML – full month, no specific dates given)
  { id: "200421", s:  1, e: 30, t: "MATERNITY_PATERNITY",st: "APPROVED", note: "Maternity Leave" },
  // ── Akshatha Gopalakrishnan (type not specified)
  { id: "200495", s: 13, e: 13, t: "OTHER",              st: "APPROVED" },
  { id: "200495", s: 27, e: 27, t: "OTHER",              st: "APPROVED" },
  // ── Vasanth Gopi (PL)
  { id: "200518", s:  3, e:  3, t: "PTO",                st: "APPROVED" },
  { id: "200518", s: 10, e: 10, t: "PTO",                st: "APPROVED" },
  { id: "200518", s: 30, e: 30, t: "PTO",                st: "APPROVED" },
];

async function main() {
  // ── 0. Clear existing manual April 2026 entries to allow clean re-import
  const { count: deleted } = await prisma.leaveEntry.deleteMany({
    where: { isManual: true, startDate: { gte: d(1) }, endDate: { lte: d(30) } },
  });
  console.log(`🗑️  Cleared ${deleted} existing manual April 2026 entries.\n`);

  // ── 1. Load all active members (keyed by empId embedded in email)
  const allMembers = await prisma.teamMember.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  // Build a map: empId string → { id, name }
  const byEmpId = new Map(
    allMembers.map(m => {
      const empId = m.email.split("@")[0]; // e.g. "200059"
      return [empId, { id: m.id, name: m.name }];
    })
  );

  // ── 2. April 14 Public Holiday for ALL active members
  console.log(`📅 Adding April 14 Public Holiday for ${allMembers.length} members…`);
  for (const m of allMembers) {
    await prisma.leaveEntry.create({
      data: {
        memberId:  m.id,
        startDate: d(14),
        endDate:   d(14),
        leaveType: "PUBLIC_HOLIDAY",
        status:    "APPROVED",
        notes:     "Public Holiday – April 14 (Dr. Ambedkar Jayanti / Tamil New Year)",
        isManual:  true,
      },
    });
  }
  console.log(`   ✓ ${allMembers.length} holiday entries added.\n`);

  // ── 3. Individual leave entries
  console.log("📋 Adding individual leave entries…");
  let created = 0;
  for (const row of LEAVES) {
    const member = byEmpId.get(row.id);
    if (!member) {
      console.warn(`   ⚠  empId ${row.id} not found in DB — skipping.`);
      continue;
    }
    await prisma.leaveEntry.create({
      data: {
        memberId:  member.id,
        startDate: d(row.s),
        endDate:   d(row.e),
        leaveType: row.t,
        status:    row.st,
        notes:     row.note,
        isManual:  true,
      },
    });
    const range = row.s === row.e ? `Apr ${row.s}` : `Apr ${row.s}–${row.e}`;
    console.log(`   ✓ ${member.name.padEnd(45)} ${range}  [${row.t}] ${row.st}`);
    created++;
  }

  console.log(`\n✅ Done — ${allMembers.length} holidays + ${created} leave entries imported.`);
  console.log("⚠️  Sabanayakam, Rahul Jegannath is in the source sheet but not in the DB — add them as a team member if needed.");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
