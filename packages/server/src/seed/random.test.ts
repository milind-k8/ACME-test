import { describe, expect, it } from "bun:test";
import { createRandom } from "./random";

const sample = (seed: number) => {
  const random = createRandom(seed);
  return Array.from({ length: 5 }, () => random.next());
};

describe("createRandom", () => {
  it("returns the same sequence for the same seed", () => {
    expect(sample(42)).toEqual(sample(42));
  });

  it("returns a different sequence for a different seed", () => {
    expect(sample(42)).not.toEqual(sample(43));
  });
});
