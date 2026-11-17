import { describe, expect, it } from "vitest";
import { hasOpaqueBackground, removeWhiteBackground } from "./cutout";
import { buildObjectFolderPrompt, OBJECT_IDEAS, VIBES } from "../ai/recipes";

/** 10x10 white image with a dark 4x4 square in the middle that has a white hole. */
function sample() {
  const w = 10, h = 10;
  const data = new Uint8ClampedArray(w * h * 4).fill(255);
  for (let y = 3; y < 7; y++) for (let x = 3; x < 7; x++) {
    const i = (y * w + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = 40;
  }
  // white pixel enclosed by the dark square (e.g. a label on the object)
  const hole = (4 * w + 4) * 4;
  data[hole] = data[hole + 1] = data[hole + 2] = 255;
  return { data, width: w, height: h };
}

const alpha = (px: { data: Uint8ClampedArray; width: number }, x: number, y: number) => px.data[(y * px.width + x) * 4 + 3];

describe("removeWhiteBackground", () => {
  it("clears the border-connected background but keeps the object and enclosed whites", () => {
    const src = sample();
    expect(hasOpaqueBackground(src)).toBe(true);
    const out = removeWhiteBackground(src);
    expect(alpha(out, 0, 0)).toBe(0);
    expect(alpha(out, 9, 9)).toBe(0);
    expect(alpha(out, 5, 5)).toBe(255);
    expect(alpha(out, 4, 4)).toBe(255);
    expect(hasOpaqueBackground(out)).toBe(false);
    // input is not mutated
    expect(alpha(src, 0, 0)).toBe(255);
  });
});

describe("object folder prompt", () => {
  it("includes the three parts and the guard rails", () => {
    const p = buildObjectFolderPrompt("a pizza box", VIBES[0].details, true);
    expect(p).toMatch(/same folder shape/);
    expect(p).toMatch(/a pizza box/);
    expect(p).toMatch(/do not paste/);
    expect(p).toMatch(/no text, no logos, no branding/);
    expect(p).toContain(VIBES[0].details);
  });
  it("has plenty of ideas", () => {
    expect(new Set(OBJECT_IDEAS).size).toBe(OBJECT_IDEAS.length);
    expect(OBJECT_IDEAS.length).toBeGreaterThan(20);
  });
});
