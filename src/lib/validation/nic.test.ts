import { describe, expect, it } from "vitest";
import { checkNic } from "./nic";

describe("checkNic", () => {
  it.each([
    ["851234567V", "851234567V"],
    ["856234567x", "856234567X"], // female (day + 500), lower-case x
    ["198512345678", "198512345678"],
    ["199856700004", "199856700004"],
    [" 2001 0560 0004 ", "200105600004"],
  ])("accepts %s", (input, normalized) => {
    expect(checkNic(input)).toEqual({ valid: true, normalized });
  });

  it.each([
    ["", "format"],
    ["85123456V", "format"], // only 8 digits
    ["851234567A", "format"],
    ["850004567V", "day"], // day 000
    ["854004567V", "day"], // day 400 is neither male nor female range
    ["18501234567", "format"], // 11 digits
    ["185012345678", "year"], // 1850
    ["199899912345", "day"], // day 999
  ])("rejects %s (%s)", (input) => {
    expect(checkNic(input).valid).toBe(false);
  });
});
