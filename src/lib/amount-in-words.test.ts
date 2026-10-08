import { describe, expect, it } from "vitest";
import { numberToWords, rupeesInWords } from "./amount-in-words";

describe("numberToWords", () => {
  it.each([
    [0, "zero"],
    [7, "seven"],
    [15, "fifteen"],
    [21, "twenty-one"],
    [100, "one hundred"],
    [105, "one hundred and five"],
    [999, "nine hundred and ninety-nine"],
    [1_000, "one thousand"],
    [1_005, "one thousand and five"],
    [91_612, "ninety-one thousand six hundred and twelve"],
    [100_000, "one hundred thousand"],
    [1_250_000, "one million two hundred and fifty thousand"],
    [20_000_000, "twenty million"],
  ])("%i -> %s", (n, words) => {
    expect(numberToWords(n)).toBe(words);
  });

  it("rejects fractions and negatives", () => {
    expect(() => numberToWords(1.5)).toThrow(RangeError);
    expect(() => numberToWords(-1)).toThrow(RangeError);
  });
});

describe("rupeesInWords", () => {
  it("writes rupees and cents", () => {
    expect(rupeesInWords(9_161_250)).toBe("Rupees Ninety-one thousand six hundred and twelve and fifty cents only");
  });

  it("omits cents when there are none", () => {
    expect(rupeesInWords(12_500_000)).toBe("Rupees One hundred and twenty-five thousand only");
  });

  it("handles small and zero amounts", () => {
    expect(rupeesInWords(5)).toBe("Rupees Zero and five cents only");
    expect(rupeesInWords(0)).toBe("Rupees Zero only");
  });

  it("marks negative amounts", () => {
    expect(rupeesInWords(-150_000)).toBe("Minus rupees One thousand five hundred only");
  });
});
