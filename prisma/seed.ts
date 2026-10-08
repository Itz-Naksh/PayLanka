/**
 * Demo data for PayLanka. ALL DATA IS FICTIONAL — names, NICs, EPF and bank
 * account numbers are made up and do not belong to real people.
 *
 * Run with:  npm run db:seed
 * This WIPES existing data first, so never point it at a real database.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, isDemoAccount } from "../src/lib/demo";
import { passwordField } from "../src/lib/validation/user";
import { seedPayrollHistory } from "./seed-payroll";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });


/**
 * The real first Admin comes from .env, so its password is never in the code.
 * It uses the same password rules as the app and is checked BEFORE any data is
 * wiped, so a typo can't leave you with an empty database and no way in.
 */
function readSeedAdmin() {
  const result = z
    .object({
      email: z.email("SEED_ADMIN_EMAIL must be a valid email").trim().toLowerCase(),
      password: passwordField,
      name: z.string().trim().min(1).default("Administrator"),
    })
    .safeParse({
      email: process.env.SEED_ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD,
      name: process.env.SEED_ADMIN_NAME || undefined,
    });
  if (!result.success) {
    const problems = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env (see .env.example).\n${problems}`);
  }
  if (isDemoAccount(result.data.email)) {
    throw new Error("SEED_ADMIN_EMAIL must be different from the demo account emails.");
  }
  return result.data;
}

/** Rupees -> cents. Seed amounts are whole rupees, so this is exact. */
const rs = (rupees: number) => rupees * 100;

type SeedAllowance = { name: string; amount: number; epfLiable: boolean };

type SeedEmployee = {
  firstName: string;
  lastName: string;
  nic: string;
  department: string;
  designation: string;
  joinDate: string;
  bankName: string;
  bankBranch: string;
  basic: number;
  allowances: SeedAllowance[];
  inactive?: boolean;
};

// Common allowance mix: Cost of Living is part of "total earnings" for EPF,
// travelling and the budgetary relief allowance are not (by this demo's policy).
const BRA: SeedAllowance = { name: "Budgetary Relief Allowance", amount: 3_500, epfLiable: false };
const cola = (amount: number): SeedAllowance => ({ name: "Cost of Living Allowance", amount, epfLiable: true });
const travel = (amount: number): SeedAllowance => ({ name: "Travelling Allowance", amount, epfLiable: false });

const EMPLOYEES: SeedEmployee[] = [
  // Finance
  { firstName: "Nimal", lastName: "Perera", nic: "198512300001", department: "Finance", designation: "Finance Manager", joinDate: "2016-03-01", bankName: "Commercial Bank", bankBranch: "Colombo 03", basic: 285_000, allowances: [BRA, cola(15_000), travel(25_000)] },
  { firstName: "Shalini", lastName: "Fernando", nic: "199245600002", department: "Finance", designation: "Senior Accountant", joinDate: "2019-07-15", bankName: "Sampath Bank", bankBranch: "Nugegoda", basic: 165_000, allowances: [BRA, cola(10_000), travel(12_000)] },
  { firstName: "Mohamed", lastName: "Rizwan", nic: "199803400003", department: "Finance", designation: "Accounts Executive", joinDate: "2022-02-01", bankName: "Hatton National Bank", bankBranch: "Dehiwala", basic: 85_000, allowances: [BRA, cola(5_000)] },
  { firstName: "Tharushi", lastName: "Wickramasinghe", nic: "200156700004", department: "Finance", designation: "Accounts Assistant", joinDate: "2024-01-08", bankName: "Bank of Ceylon", bankBranch: "Maharagama", basic: 62_000, allowances: [BRA] },
  // Sales
  { firstName: "Kasun", lastName: "Jayasuriya", nic: "198874500005", department: "Sales", designation: "Sales Manager", joinDate: "2017-05-02", bankName: "Commercial Bank", bankBranch: "Kandy", basic: 240_000, allowances: [BRA, cola(12_000), travel(30_000)] },
  { firstName: "Fathima", lastName: "Nazeer", nic: "199567800006", department: "Sales", designation: "Key Account Executive", joinDate: "2020-09-01", bankName: "People's Bank", bankBranch: "Kurunegala", basic: 115_000, allowances: [BRA, cola(7_500), travel(15_000)] },
  { firstName: "Ruwan", lastName: "Bandara", nic: "199710100007", department: "Sales", designation: "Sales Executive", joinDate: "2021-11-15", bankName: "Seylan Bank", bankBranch: "Gampaha", basic: 78_000, allowances: [BRA, travel(10_000)] },
  { firstName: "Dilani", lastName: "Gunawardena", nic: "200023400008", department: "Sales", designation: "Sales Coordinator", joinDate: "2023-04-03", bankName: "Sampath Bank", bankBranch: "Negombo", basic: 68_000, allowances: [BRA] },
  // Operations
  { firstName: "Saman", lastName: "Kumara", nic: "198134500009", department: "Operations", designation: "Operations Manager", joinDate: "2015-01-05", bankName: "Bank of Ceylon", bankBranch: "Kelaniya", basic: 210_000, allowances: [BRA, cola(12_000), travel(20_000)] },
  { firstName: "Priyantha", lastName: "Silva", nic: "198667800010", department: "Operations", designation: "Warehouse Supervisor", joinDate: "2018-06-11", bankName: "People's Bank", bankBranch: "Wattala", basic: 95_000, allowances: [BRA, cola(6_000)] },
  { firstName: "Arun", lastName: "Selvaraj", nic: "199390100011", department: "Operations", designation: "Logistics Officer", joinDate: "2020-03-16", bankName: "Hatton National Bank", bankBranch: "Jaffna", basic: 72_000, allowances: [BRA, cola(4_000)] },
  { firstName: "Chaminda", lastName: "Rathnayake", nic: "199912300012", department: "Operations", designation: "Store Keeper", joinDate: "2022-08-01", bankName: "Bank of Ceylon", bankBranch: "Ja-Ela", basic: 55_000, allowances: [BRA], inactive: true },
  // IT
  { firstName: "Isuru", lastName: "Dissanayake", nic: "199145600013", department: "IT", designation: "IT Lead", joinDate: "2018-10-01", bankName: "Commercial Bank", bankBranch: "Rajagiriya", basic: 260_000, allowances: [BRA, cola(10_000)] },
  { firstName: "Nadeesha", lastName: "Herath", nic: "199678900014", department: "IT", designation: "Software Engineer", joinDate: "2021-05-17", bankName: "Nations Trust Bank", bankBranch: "Colombo 07", basic: 175_000, allowances: [BRA, cola(8_000)] },
  { firstName: "Hasitha", lastName: "Senanayake", nic: "200245600015", department: "IT", designation: "IT Support Associate", joinDate: "2025-02-10", bankName: "Sampath Bank", bankBranch: "Malabe", basic: 65_000, allowances: [BRA] },
];

async function main() {
  const seedAdmin = readSeedAdmin();

  console.log("Clearing existing data…");
  // Children before parents, so foreign keys don't block the deletes.
  await prisma.$transaction([
    // Approved payroll is locked by database triggers; the seed is the one
    // place allowed to wipe it, and only inside this transaction.
    prisma.$queryRaw`SELECT set_config('paylanka.allow_purge', 'on', true)`,
    prisma.auditLog.deleteMany(),
    prisma.payrollItemLine.deleteMany(),
    prisma.payrollItem.deleteMany(),
    prisma.payrollRun.deleteMany(),
    prisma.user.deleteMany(),
    prisma.employeeAllowance.deleteMany(),
    prisma.employee.deleteMany(),
    prisma.department.deleteMany(),
    prisma.companySettings.deleteMany(),
    prisma.taxBracket.deleteMany(),
    prisma.taxTable.deleteMany(),
  ]);

  console.log("Creating company settings…");
  // Rates fall back to the schema defaults (EPF 8% / 12%, ETF 3%).
  await prisma.companySettings.create({
    data: {
      id: 1,
      name: "Lanka Demo Traders (Pvt) Ltd",
      address: "No. 42, Galle Road, Colombo 03, Sri Lanka",
      epfRegNo: "DEMO/EPF/00123",
      etfRegNo: "DEMO/ETF/00123",
    },
  });

  console.log("Creating departments and employees…");
  const departmentNames = [...new Set(EMPLOYEES.map((e) => e.department))];
  const departments = new Map<string, string>();
  for (const name of departmentNames) {
    const dept = await prisma.department.create({ data: { name } });
    departments.set(name, dept.id);
  }

  const employeeIds: string[] = [];
  for (const [index, e] of EMPLOYEES.entries()) {
    const number = String(index + 1).padStart(3, "0");
    const employee = await prisma.employee.create({
      data: {
        employeeNo: `EMP${number}`,
        firstName: e.firstName,
        lastName: e.lastName,
        nic: e.nic,
        epfNo: `${1000 + index + 1}`,
        departmentId: departments.get(e.department)!,
        designation: e.designation,
        joinDate: new Date(e.joinDate),
        bankName: e.bankName,
        bankBranch: e.bankBranch,
        accountNo: `DEMO-${String(80_000_000 + (index + 1) * 7_331)}`,
        basicSalaryCents: rs(e.basic),
        status: e.inactive ? "INACTIVE" : "ACTIVE",
        deactivatedAt: e.inactive ? new Date("2026-06-30") : null,
        allowances: {
          create: e.allowances.map((a) => ({
            name: a.name,
            amountCents: rs(a.amount),
            epfLiable: a.epfLiable,
          })),
        },
      },
    });
    employeeIds.push(employee.id);
  }

  console.log(`Creating the first Admin (${seedAdmin.email})…`);
  await prisma.user.create({
    data: {
      email: seedAdmin.email,
      name: seedAdmin.name,
      role: "ADMIN",
      passwordHash: await bcrypt.hash(seedAdmin.password, 10),
    },
  });

  // Demo accounts are NOT forced to change their password: on a shared demo the
  // first visitor would otherwise lock everyone else out.
  console.log("Creating demo logins…");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  // The demo Employee login belongs to employee #3 so it has real payslips to view.
  const demoEmployeeIndex = 2;
  await prisma.user.createMany({
    data: DEMO_ACCOUNTS.map((account) =>
      account.role === "EMPLOYEE"
        ? {
            email: account.email,
            name: `${EMPLOYEES[demoEmployeeIndex].firstName} ${EMPLOYEES[demoEmployeeIndex].lastName}`,
            role: account.role,
            passwordHash,
            employeeId: employeeIds[demoEmployeeIndex],
          }
        : { email: account.email, name: account.name, role: account.role, passwordHash },
    ),
  });

  console.log("Creating 12 months of payroll history…");
  const runs = await seedPayrollHistory(prisma);

  console.log(
    `Done: ${runs} payroll runs, 1 company, ${departments.size} departments, ${EMPLOYEES.length} employees, 1 admin + 3 demo users.\n` +
      `Sign in as ${seedAdmin.email} (password from .env), or use a demo account (password ${DEMO_PASSWORD}).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
