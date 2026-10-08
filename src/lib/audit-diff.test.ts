import { describe, expect, it } from "vitest";
import { diffFields } from "./audit-diff";

describe("diffFields", () => {
  const before = { name: "Nimal", basic: 100, joinDate: new Date("2020-01-01"), branch: null as string | null };

  it("lists only changed keys", () => {
    expect(diffFields(before, { name: "Nimal", basic: 150 }, ["name", "basic"])).toEqual({
      basic: { from: 100, to: 150 },
    });
  });

  it("compares dates by calendar day", () => {
    expect(diffFields(before, { joinDate: new Date("2020-01-01T00:00:00Z") }, ["joinDate"])).toEqual({});
    expect(diffFields(before, { joinDate: new Date("2021-01-01") }, ["joinDate"])).toEqual({
      joinDate: { from: "2020-01-01", to: "2021-01-01" },
    });
  });

  it("ignores keys not being tracked or not supplied", () => {
    expect(diffFields(before, { branch: "Kandy" }, ["name"])).toEqual({});
    expect(diffFields(before, {}, ["name", "branch"])).toEqual({});
  });
});
