//! Image decoding and icon encoding shared by all platforms.
use crate::error::{AppError, AppResult};
use base64::{engine::general_purpose::STANDARD, Engine};
use image::{imageops::FilterType, ImageFormat, RgbaImage};
use std::io::Cursor;

/// Upper bound for images coming from the UI (decoded bytes).
const MAX_PNG_BYTES: usize = 32 * 1024 * 1024;
/// Sizes embedded in Windows .ico files (Explorer picks the best match per view).
pub const ICO_SIZES: [u32; 7] = [16, 24, 32, 48, 64, 128, 256];

pub fn decode_png_base64(b64: &str) -> AppResult<RgbaImage> {
    if b64.len() > MAX_PNG_BYTES / 3 * 4 + 4 {
        return Err(AppError::Invalid("image is too large".into()));
    }
    let bytes = STANDARD
        .decode(b64.trim())
        .map_err(|e| AppError::Invalid(format!("bad base64: {e}")))?;
    let img = image::load_from_memory_with_format(&bytes, ImageFormat::Png)?.to_rgba8();
    if img.width() != img.height() || !(16..=4096).contains(&img.width()) {
        return Err(AppError::Invalid("icon must be square and 16–4096 px".into()));
    }
    Ok(img)
}

fn resized(img: &RgbaImage, size: u32) -> RgbaImage {
    if img.width() == size {
        img.clone()
    } else {
        image::imageops::resize(img, size, size, FilterType::Lanczos3)
    }
}

pub fn build_ico(img: &RgbaImage) -> AppResult<Vec<u8>> {
    let mut dir = ico::IconDir::new(ico::ResourceType::Icon);
    for &s in &ICO_SIZES {
        let frame = ico::IconImage::from_rgba_data(s, s, resized(img, s).into_raw());
        dir.add_entry(ico::IconDirEntry::encode(&frame)?);
    }
    let mut out = Vec::new();
    dir.write(&mut out)?;
    Ok(out)
}

pub fn encode_png(img: &RgbaImage, size: u32) -> AppResult<Vec<u8>> {
    let mut buf = Cursor::new(Vec::new());
    resized(img, size).write_to(&mut buf, ImageFormat::Png)?;
    Ok(buf.into_inner())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> RgbaImage {
        RgbaImage::from_fn(512, 512, |x, y| image::Rgba([x as u8, y as u8, 128, 255]))
    }

    #[test]
    fn ico_contains_all_sizes() {
        let bytes = build_ico(&sample()).unwrap();
        let dir = ico::IconDir::read(Cursor::new(bytes)).unwrap();
        let mut sizes: Vec<u32> = dir.entries().iter().map(|e| e.width()).collect();
        sizes.sort();
        assert_eq!(sizes, ICO_SIZES.to_vec());
    }

    #[test]
    fn png_roundtrip_through_base64() {
        let png = encode_png(&sample(), 256).unwrap();
        let img = decode_png_base64(&STANDARD.encode(png)).unwrap();
        assert_eq!(img.dimensions(), (256, 256));
    }

    #[test]
    fn rejects_non_square() {
        let img = RgbaImage::new(64, 32);
        let mut buf = Cursor::new(Vec::new());
        img.write_to(&mut buf, ImageFormat::Png).unwrap();
        assert!(decode_png_base64(&STANDARD.encode(buf.into_inner())).is_err());
    }
}
