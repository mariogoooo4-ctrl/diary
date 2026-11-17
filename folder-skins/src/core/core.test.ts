import { describe, expect, it } from "vitest";
import { renderSkinSvg } from "./render";
import { BUILTIN_PACKS } from "./presets";
import { parsePackFile, serializePack, PACK_FILE_FORMAT } from "./packs";
import { SkinSchema, defaultSkin, SHAPES } from "./skin";

describe("presets", () => {
  it("are all valid skins with unique ids", () => {
    const ids = new Set<string>();
    for (const p of BUILTIN_PACKS) {
      for (const s of p.skins) {
        expect(() => SkinSchema.parse(s)).not.toThrow();
        expect(ids.has(s.id)).toBe(false);
        ids.add(s.id);
      }
    }
    expect(ids.size).toBeGreaterThan(50);
  });
});

describe("renderSkinSvg", () => {
  it("renders every shape and fill type", () => {
    for (const shape of SHAPES) {
      for (const fill of [
        { type: "solid", color: "#112233" },
        { type: "linear", from: "#112233", to: "#445566", angle: 45 },
        { type: "radial", from: "#112233", to: "#445566" },
      ] as const) {
        const svg = renderSkinSvg(defaultSkin({ shape, fill, effects: { shadow: true, gloss: true, glow: true } }), "t");
        expect(svg.startsWith("<svg")).toBe(true);
        expect(svg).toContain('viewBox="0 0 256 256"');
      }
    }
  });

  it("escapes badge text", () => {
    const svg = renderSkinSvg(defaultSkin({ badge: { kind: "text", value: "<&>", color: "#ffffff" } }));
    expect(svg).toContain("&lt;&amp;&gt;");
    expect(svg).not.toContain("<&>");
  });

  it("full artwork replaces the folder", () => {
    const svg = renderSkinSvg(defaultSkin({ artwork: { dataUrl: "data:image/png;base64,AAAA", fit: "full" } }));
    expect(svg).toContain("<image");
    expect(svg).not.toContain("<path");
  });
});

describe("pack files", () => {
  it("round-trip and assign fresh ids", () => {
    const pack = BUILTIN_PACKS[0];
    const text = serializePack(pack);
    expect(JSON.parse(text).format).toBe(PACK_FILE_FORMAT);
    const back = parsePackFile(text);
    expect(back.name).toBe(pack.name);
    expect(back.skins).toHaveLength(pack.skins.length);
    expect(back.id).not.toBe(pack.id);
    expect(back.skins[0].id).not.toBe(pack.skins[0].id);
    expect(back.builtin).toBe(false);
  });

  it("rejects garbage", () => {
    expect(() => parsePackFile("nope")).toThrow();
    expect(() => parsePackFile(JSON.stringify({ format: "other", version: 1, pack: {} }))).toThrow();
    expect(() => parsePackFile(JSON.stringify({ format: PACK_FILE_FORMAT, version: 1, pack: { id: "x", name: "x", skins: [{ bad: true }] } }))).toThrow();
  });
});
