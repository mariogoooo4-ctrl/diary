//! IPC commands exposed to the UI. Keep these thin: validate input, then
//! delegate to `icon`, `platform` and friends.
use crate::error::{AppError, AppResult};
use crate::{icon, platform};
use serde::Serialize;
use std::path::{Path, PathBuf};

const MAX_TEXT_FILE: u64 = 50 * 1024 * 1024;

#[derive(Serialize)]
pub struct PlatformInfo {
    os: &'static str,
    supported: bool,
}

#[tauri::command]
pub fn platform_info() -> PlatformInfo {
    PlatformInfo { os: platform::OS, supported: platform::SUPPORTED }
}

fn validate_folder(folder: &str) -> AppResult<PathBuf> {
    let p = PathBuf::from(folder);
    if !p.is_absolute() {
        return Err(AppError::Invalid("folder path must be absolute".into()));
    }
    if !p.is_dir() {
        return Err(AppError::Invalid(format!("not a folder: {folder}")));
    }
    if p.parent().is_none() {
        return Err(AppError::Invalid("cannot change the icon of a drive root".into()));
    }
    Ok(p)
}

fn require_ext(path: &Path, allowed: &[&str]) -> AppResult<String> {
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_ascii_lowercase();
    if allowed.contains(&ext.as_str()) {
        Ok(ext)
    } else {
        Err(AppError::Invalid(format!("unsupported file type (expected {})", allowed.join(", "))))
    }
}

async fn blocking<T: Send + 'static>(f: impl FnOnce() -> AppResult<T> + Send + 'static) -> AppResult<T> {
    tauri::async_runtime::spawn_blocking(f).await.map_err(|e| AppError::Platform(e.to_string()))?
}

#[tauri::command]
pub async fn apply_skin(folder: String, png_base64: String) -> AppResult<()> {
    let path = validate_folder(&folder)?;
    blocking(move || {
        let img = icon::decode_png_base64(&png_base64)?;
        platform::apply(&path, &img)
    })
    .await
}

#[tauri::command]
pub async fn revert_skin(folder: String) -> AppResult<()> {
    let path = validate_folder(&folder)?;
    blocking(move || platform::revert(&path)).await
}

#[tauri::command]
pub async fn read_text_file(path: String) -> AppResult<String> {
    let p = PathBuf::from(path);
    require_ext(&p, &["fskin", "json"])?;
    if std::fs::metadata(&p)?.len() > MAX_TEXT_FILE {
        return Err(AppError::Invalid("file is too large".into()));
    }
    Ok(std::fs::read_to_string(p)?)
}

#[tauri::command]
pub async fn write_text_file(path: String, contents: String) -> AppResult<()> {
    let p = PathBuf::from(path);
    require_ext(&p, &["fskin", "json"])?;
    Ok(std::fs::write(p, contents)?)
}

#[tauri::command]
pub async fn save_icon_file(path: String, png_base64: String) -> AppResult<()> {
    let p = PathBuf::from(path);
    let ext = require_ext(&p, &["ico", "png"])?;
    blocking(move || {
        let img = icon::decode_png_base64(&png_base64)?;
        let bytes = if ext == "ico" { icon::build_ico(&img)? } else { icon::encode_png(&img, img.width())? };
        Ok(std::fs::write(p, bytes)?)
    })
    .await
}
