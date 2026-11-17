/**
 * Remove a plain white/light background from a generated image so it can be
 * used as a folder icon. Pure function over RGBA pixels (testable without DOM).
 *
 * Flood-fills from the image border through near-white pixels, so white areas
 * *inside* the object (labels, foam trays) are kept. Edge pixels get a soft
 * alpha so the cut-out doesn't look jagged.
 */
export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export function hasOpaqueBackground(px: Pixels): boolean {
  const { data, width: w, height: h } = px;
  const corners = [0, w - 1, (h - 1) * w, h * w - 1];
  return corners.every((i) => data[i * 4 + 3] > 245);
}

export function removeWhiteBackground(px: Pixels, tolerance = 18): Pixels {
  const { width: w, height: h } = px;
  const data = new Uint8ClampedArray(px.data);
  const limit = 255 - tolerance;
  const isLight = (i: number) => data[i * 4] >= limit && data[i * 4 + 1] >= limit && data[i * 4 + 2] >= limit;

  const bg = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (i: number) => {
    if (!bg[i] && isLight(i)) {
      bg[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w, y = (i - x) / w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (y > 0) push(i - w);
    if (y < h - 1) push(i + w);
  }

  for (let i = 0; i < w * h; i++) {
    if (bg[i]) {
      data[i * 4 + 3] = 0;
      continue;
    }
    // Soften pixels that touch the background: lighter -> more transparent.
    const x = i % w, y = (i - x) / w;
    const touches = (x > 0 && bg[i - 1]) || (x < w - 1 && bg[i + 1]) || (y > 0 && bg[i - w]) || (y < h - 1 && bg[i + w]);
    if (touches) {
      const min = Math.min(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
      const lightness = Math.max(0, (min - 180) / 75); // 0 for dark, 1 for white
      data[i * 4 + 3] = Math.round(data[i * 4 + 3] * (1 - 0.7 * lightness));
    }
  }
  return { data, width: w, height: h };
}
