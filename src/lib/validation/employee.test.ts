import { describe, expect, it } from "vitest";
import { employeeSchema } from "./employee";
import { companySettingsSchema } from "./settings";
import { createUserSchema } from "./user";

const validEmployee = {
  employeeNo: "emp016",
  firstName: "Kamala",
  lastName: "Weerasinghe",
  nic: "199556700016",
  epfNo: "",
  departmentId: "dept1",
  designation: "Clerk",
  joinDate: "2026-01-05",
  bankName: "Sampath Bank",
  bankBranch: "",
  accountNo: "1234 5678",
  basicSalary: "75,000.00",
  allowances: [
    { name: "COLA", amount: "5000", epfLiable: "on" },
    { name: "Transport", amount: "2500.50" },
  ],
};

describe("employeeSchema", () => {
  it("parses a valid employee into stored types", () => {
    const result = employeeSchema.parse(validEmployee);
    expect(result.employeeNo).toBe("EMP016");
    expect(result.basicSalary).toBe(7_500_000);
    expect(result.epfNo).toBeNull();
    expect(result.bankBranch).toBeNull();
    expect(result.allowances).toEqual([
      { name: "COLA", amount: 500_000, epfLiable: true },
      { name: "Transport", amount: 250_050, epfLiable: false },
    ]);
  });

  it("defaults to no allowances", () => {
    expect(employeeSchema.parse({ ...validEmployee, allowances: undefined }).allowances).toEqual([]);
  });

  it.each([
    ["nic", "12345"],
    ["basicSalary", "0"],
    ["basicSalary", "-500"],
    ["basicSalary", "12.345"],
    ["joinDate", "2026-13-01"],
    ["employeeNo", "EMP 16"],
    ["firstName", "   "],
  ])("rejects invalid %s (%s)", (field, value) => {
    const result = employeeSchema.safeParse({ ...validEmployee, [field]: value });
    expect(result.success).toBe(false);
    expect(result.error!.issues[0].path).toEqual([field]);
  });

  it("rejects a zero allowance", () => {
    const result = employeeSchema.safeParse({
      ...validEmployee,
      allowances: [{ name: "Bonus", amount: "0" }],
    });
    expect(result.error!.issues[0].path).toEqual(["allowances", 0, "amount"]);
  });
});

describe("companySettingsSchema", () => {
  const valid = {
    name: "Demo",
    address: "Colombo",
    epfRegNo: "A/1",
    etfRegNo: "B/1",
    epfEmployeeRateBp: "8",
    epfEmployerRateBp: "12",
    etfEmployerRateBp: "3",
    otHourlyDivisor: "240",
    otMultiplierBp: "1.5",
    noPayDayDivisor: "30",
  };

  it("converts rates to basis points", () => {
    expect(companySettingsSchema.parse(valid)).toMatchObject({
      epfEmployeeRateBp: 800,
      epfEmployerRateBp: 1200,
      etfEmployerRateBp: 300,
      otHourlyDivisor: 240,
      otMultiplierBp: 15_000,
      noPayDayDivisor: 30,
    });
  });

  it("rejects out-of-range values", () => {
    expect(companySettingsSchema.safeParse({ ...valid, epfEmployeeRateBp: "80" }).success).toBe(false);
    expect(companySettingsSchema.safeParse({ ...valid, noPayDayDivisor: "0" }).success).toBe(false);
    expect(companySettingsSchema.safeParse({ ...valid, otMultiplierBp: "0.5" }).success).toBe(false);
  });
});

describe("createUserSchema", () => {
  const base = { name: "Test", email: "T@Example.com", password: "secret123", role: "HR" };

  it("normalises email", () => {
    expect(createUserSchema.parse(base).email).toBe("t@example.com");
  });

  it("requires an employee link for EMPLOYEE logins", () => {
    const result = createUserSchema.safeParse({ ...base, role: "EMPLOYEE" });
    expect(result.error!.issues[0].path).toEqual(["employeeId"]);
  });

  it("enforces a minimum password strength", () => {
    expect(createUserSchema.safeParse({ ...base, password: "short1" }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...base, password: "lettersonly" }).success).toBe(false);
  });
});
