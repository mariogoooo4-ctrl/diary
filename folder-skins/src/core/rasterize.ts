import type { Skin } from "./skin";
import { renderSkinSvg } from "./render";
import { hasOpaqueBackground, removeWhiteBackground } from "./cutout";

/** Size handed to the native layer. macOS uses it directly; Windows downsamples to an .ico set. */
export const APPLY_SIZE = 1024;

export async function svgToPngBlob(svg: string, size: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D not available");
    ctx.drawImage(img, 0, 0, size, size);
    return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("PNG encode failed"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}

export async function skinToPngBase64(skin: Skin, size = APPLY_SIZE): Promise<string> {
  const blob = await svgToPngBlob(renderSkinSvg(skin, `r${size}`), size);
  return (await blobToDataUrl(blob)).split(",")[1];
}

/** Downscale an arbitrary user/AI image to keep skins (and packs) small. */
export async function normalizeImage(dataUrl: string, maxSize = 512): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

/**
 * Reference image for image-to-image generation: the skin's folder silhouette
 * in a neutral colour on white, with no badge, artwork or effects.
 */
export async function folderReferencePng(skin: Skin, size = 1024): Promise<Blob> {
  const plain: Skin = {
    ...skin,
    fill: { type: "solid", color: "#8fb3e8" },
    accent: undefined,
    badge: { kind: "none" },
    artwork: undefined,
    effects: { shadow: false, gloss: false, glow: false },
  };
  const url = URL.createObjectURL(new Blob([renderSkinSvg(plain, "ref")], { type: "image/svg+xml" }));
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("PNG encode failed"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** If the image has an opaque light background, cut it out. */
export async function cutoutIfNeeded(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const px = ctx.getImageData(0, 0, img.width, img.height);
  if (!hasOpaqueBackground(px)) return dataUrl;
  const out = removeWhiteBackground(px);
  ctx.putImageData(new ImageData(out.data as Uint8ClampedArray<ArrayBuffer>, out.width, out.height), 0, 0);
  return canvas.toDataURL("image/png");
}
