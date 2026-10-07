-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'HR', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED');

-- CreateEnum
CREATE TYPE "LineType" AS ENUM ('EARNING', 'DEDUCTION');

-- CreateEnum
CREATE TYPE "LineSource" AS ENUM ('FIXED_ALLOWANCE', 'EXTRA_ALLOWANCE', 'OTHER_DEDUCTION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "employeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "epfRegNo" TEXT NOT NULL,
    "etfRegNo" TEXT NOT NULL,
    "epfEmployeeRateBp" INTEGER NOT NULL DEFAULT 800,
    "epfEmployerRateBp" INTEGER NOT NULL DEFAULT 1200,
    "etfEmployerRateBp" INTEGER NOT NULL DEFAULT 300,
    "otHourlyDivisor" INTEGER NOT NULL DEFAULT 240,
    "otMultiplierBp" INTEGER NOT NULL DEFAULT 15000,
    "noPayDayDivisor" INTEGER NOT NULL DEFAULT 30,
    "apitEnabled" BOOLEAN NOT NULL DEFAULT false,
    "activeTaxTableId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "employeeNo" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "nic" TEXT NOT NULL,
    "epfNo" TEXT,
    "departmentId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "joinDate" DATE NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankBranch" TEXT,
    "accountNo" TEXT NOT NULL,
    "basicSalaryCents" INTEGER NOT NULL,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeAllowance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "epfLiable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EmployeeAllowance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "epfEmployeeRateBp" INTEGER NOT NULL,
    "epfEmployerRateBp" INTEGER NOT NULL,
    "etfEmployerRateBp" INTEGER NOT NULL,
    "otHourlyDivisor" INTEGER NOT NULL,
    "otMultiplierBp" INTEGER NOT NULL,
    "noPayDayDivisor" INTEGER NOT NULL,
    "apitEnabled" BOOLEAN NOT NULL,
    "createdById" TEXT NOT NULL,
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollItem" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeNo" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "nic" TEXT NOT NULL,
    "epfNo" TEXT,
    "departmentName" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankBranch" TEXT,
    "accountNo" TEXT NOT NULL,
    "overtimeHours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "noPayDays" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "basicCents" INTEGER NOT NULL,
    "fixedAllowancesCents" INTEGER NOT NULL,
    "extraAllowancesCents" INTEGER NOT NULL,
    "overtimeCents" INTEGER NOT NULL,
    "noPayCents" INTEGER NOT NULL,
    "grossCents" INTEGER NOT NULL,
    "epfLiableCents" INTEGER NOT NULL,
    "epfEmployeeCents" INTEGER NOT NULL,
    "epfEmployerCents" INTEGER NOT NULL,
    "etfEmployerCents" INTEGER NOT NULL,
    "apitCents" INTEGER NOT NULL,
    "otherDeductionsCents" INTEGER NOT NULL,
    "totalDeductionsCents" INTEGER NOT NULL,
    "netCents" INTEGER NOT NULL,

    CONSTRAINT "PayrollItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollItemLine" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "type" "LineType" NOT NULL,
    "source" "LineSource" NOT NULL,
    "label" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "epfLiable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PayrollItemLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxTable" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,

    CONSTRAINT "TaxTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxBracket" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "fromCents" INTEGER NOT NULL,
    "toCents" INTEGER,
    "rateBp" INTEGER NOT NULL,

    CONSTRAINT "TaxBracket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeNo_key" ON "Employee"("employeeNo");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_nic_key" ON "Employee"("nic");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_epfNo_key" ON "Employee"("epfNo");

-- CreateIndex
CREATE INDEX "Employee_status_idx" ON "Employee"("status");

-- CreateIndex
CREATE INDEX "Employee_departmentId_idx" ON "Employee"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRun_year_month_key" ON "PayrollRun"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollItem_runId_employeeId_key" ON "PayrollItem"("runId", "employeeId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySettings" ADD CONSTRAINT "CompanySettings_activeTaxTableId_fkey" FOREIGN KEY ("activeTaxTableId") REFERENCES "TaxTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAllowance" ADD CONSTRAINT "EmployeeAllowance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItemLine" ADD CONSTRAINT "PayrollItemLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PayrollItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxBracket" ADD CONSTRAINT "TaxBracket_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "TaxTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
