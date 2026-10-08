import { describe, expect, it } from "vitest";
import { z } from "zod";
import { formDataToObject, zodFieldErrors } from "./form-data";

function fd(entries: Array<[string, string]>) {
  const data = new FormData();
  for (const [k, v] of entries) data.append(k, v);
  return data;
}

describe("formDataToObject", () => {
  it("keeps flat fields", () => {
    expect(formDataToObject(fd([["name", "Nimal"], ["basic", "1000"]]))).toEqual({
      name: "Nimal",
      basic: "1000",
    });
  });

  it("builds lists of objects from bracket names", () => {
    const result = formDataToObject(
      fd([
        ["allowances[0][name]", "Transport"],
        ["allowances[0][amount]", "5000"],
        ["allowances[1][name]", "COLA"],
        ["allowances[1][epfLiable]", "on"],
      ]),
    );
    expect(result).toEqual({
      allowances: [{ name: "Transport", amount: "5000" }, { name: "COLA", epfLiable: "on" }],
    });
  });

  it("closes gaps left by removed rows", () => {
    const result = formDataToObject(fd([["items[0][a]", "x"], ["items[2][a]", "y"]]));
    expect(result.items).toEqual([{ a: "x" }, { a: "y" }]);
  });
});

describe("zodFieldErrors", () => {
  it("keys messages by dotted path", () => {
    const schema = z.object({ name: z.string().min(1, "Required"), list: z.array(z.object({ n: z.number() })) });
    const parsed = schema.safeParse({ name: "", list: [{ n: "x" }] });
    expect(parsed.success).toBe(false);
    const errors = zodFieldErrors(parsed.error!);
    expect(errors.name).toEqual(["Required"]);
    expect(errors["list.0.n"]).toHaveLength(1);
  });
});
