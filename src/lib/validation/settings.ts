import { z } from "zod";
import { multiplier, percent, requiredText, wholeNumber } from "./fields";

export const companySettingsSchema = z.object({
  name: requiredText("Company name", 150),
  address: requiredText("Address", 300),
  epfRegNo: requiredText("EPF registration number", 50),
  etfRegNo: requiredText("ETF registration number", 50),
  epfEmployeeRateBp: percent("EPF employee rate", 50),
  epfEmployerRateBp: percent("EPF employer rate", 50),
  etfEmployerRateBp: percent("ETF employer rate", 50),
  otHourlyDivisor: wholeNumber("OT hourly divisor", 1, 744),
  otMultiplierBp: multiplier("OT multiplier", 1, 5),
  noPayDayDivisor: wholeNumber("No-pay day divisor", 1, 31),
});

export type CompanySettingsInput = z.output<typeof companySettingsSchema>;
