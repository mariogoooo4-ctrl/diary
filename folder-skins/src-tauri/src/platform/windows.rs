//! Windows: Explorer shows a custom folder icon when the folder has the
//! ReadOnly (or System) attribute and contains a desktop.ini with
//! `[.ShellClassInfo] IconResource=...`. We write a hidden .ico next to it.
//! A unique icon file name per apply defeats Explorer's icon cache.
use crate::desktop_ini::{self, Encoding};
use crate::error::{AppError, AppResult};
use crate::icon;
use image::RgbaImage;
use std::ffi::c_void;
use std::fs;
use std::io::ErrorKind;
use std::os::windows::ffi::OsStrExt;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};
use windows_sys::Win32::Storage::FileSystem::{
    GetFileAttributesW, SetFileAttributesW, FILE_ATTRIBUTE_ARCHIVE, FILE_ATTRIBUTE_HIDDEN, FILE_ATTRIBUTE_NORMAL,
    FILE_ATTRIBUTE_NOT_CONTENT_INDEXED, FILE_ATTRIBUTE_READONLY, FILE_ATTRIBUTE_SYSTEM, INVALID_FILE_ATTRIBUTES,
};
use windows_sys::Win32::UI::Shell::{SHChangeNotify, SHCNE_UPDATEDIR, SHCNE_UPDATEITEM, SHCNF_PATHW};

const INI: &str = "desktop.ini";
const SETTABLE: u32 = FILE_ATTRIBUTE_ARCHIVE | FILE_ATTRIBUTE_HIDDEN | FILE_ATTRIBUTE_NOT_CONTENT_INDEXED
    | FILE_ATTRIBUTE_READONLY | FILE_ATTRIBUTE_SYSTEM;

fn wide(p: &Path) -> Vec<u16> {
    p.as_os_str().encode_wide().chain(std::iter::once(0)).collect()
}

fn get_attrs(p: &Path) -> Option<u32> {
    let a = unsafe { GetFileAttributesW(wide(p).as_ptr()) };
    (a != INVALID_FILE_ATTRIBUTES).then_some(a)
}

fn set_attrs(p: &Path, attrs: u32) -> AppResult<()> {
    let attrs = if attrs & SETTABLE == 0 { FILE_ATTRIBUTE_NORMAL } else { attrs & SETTABLE };
    if unsafe { SetFileAttributesW(wide(p).as_ptr(), attrs) } == 0 {
        return Err(std::io::Error::last_os_error().into());
    }
    Ok(())
}

fn notify_shell(folder: &Path) {
    let w = wide(folder);
    unsafe {
        SHChangeNotify(SHCNE_UPDATEITEM as _, SHCNF_PATHW as _, w.as_ptr() as *const c_void, std::ptr::null());
        SHChangeNotify(SHCNE_UPDATEDIR as _, SHCNF_PATHW as _, w.as_ptr() as *const c_void, std::ptr::null());
    }
}

/// Delete our generated icons, except `keep`.
fn remove_icons(folder: &Path, keep: Option<&str>) {
    let Ok(entries) = fs::read_dir(folder) else { return };
    for e in entries.flatten() {
        let name = e.file_name().to_string_lossy().to_string();
        if name.starts_with(desktop_ini::ICON_PREFIX) && name.ends_with(desktop_ini::ICON_EXT) && Some(name.as_str()) != keep {
            let _ = set_attrs(&e.path(), FILE_ATTRIBUTE_NORMAL);
            let _ = fs::remove_file(e.path());
        }
    }
}

fn read_ini(path: &Path) -> AppResult<Option<(String, Encoding)>> {
    match fs::read(path) {
        Ok(bytes) => Ok(Some(desktop_ini::decode(&bytes))),
        Err(e) if e.kind() == ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.into()),
    }
}

fn write_ini(path: &Path, text: &str, enc: Encoding) -> AppResult<()> {
    if path.exists() {
        set_attrs(path, FILE_ATTRIBUTE_NORMAL)?;
    }
    fs::write(path, desktop_ini::encode(text, enc))?;
    set_attrs(path, FILE_ATTRIBUTE_HIDDEN | FILE_ATTRIBUTE_SYSTEM)
}

pub fn apply(folder: &Path, img: &RgbaImage) -> AppResult<()> {
    let folder_attrs = get_attrs(folder).ok_or_else(|| AppError::Invalid("folder not found".into()))?;

    let stamp = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0);
    let icon_name = format!("{}{stamp}{}", desktop_ini::ICON_PREFIX, desktop_ini::ICON_EXT);
    let icon_path = folder.join(&icon_name);
    fs::write(&icon_path, icon::build_ico(img)?)?;
    set_attrs(&icon_path, FILE_ATTRIBUTE_HIDDEN | FILE_ATTRIBUTE_SYSTEM)?;

    let ini_path = folder.join(INI);
    let (existing, enc) = match read_ini(&ini_path)? {
        Some((t, e)) => (Some(t), e),
        None => (None, Encoding::Utf8),
    };
    let need_ro = folder_attrs & (FILE_ATTRIBUTE_READONLY | FILE_ATTRIBUTE_SYSTEM) == 0;
    let content = desktop_ini::apply(existing.as_deref(), &icon_name, need_ro);
    write_ini(&ini_path, &content, enc)?;
    if need_ro {
        set_attrs(folder, folder_attrs | FILE_ATTRIBUTE_READONLY)?;
    }

    remove_icons(folder, Some(&icon_name));
    notify_shell(folder);
    Ok(())
}

pub fn revert(folder: &Path) -> AppResult<()> {
    let ini_path = folder.join(INI);
    if let Some((text, enc)) = read_ini(&ini_path)? {
        if desktop_ini::is_managed(&text) {
            let r = desktop_ini::revert(&text);
            match r.content {
                Some(c) => write_ini(&ini_path, &c, enc)?,
                None => {
                    set_attrs(&ini_path, FILE_ATTRIBUTE_NORMAL)?;
                    fs::remove_file(&ini_path)?;
                }
            }
            if r.clear_readonly {
                if let Some(a) = get_attrs(folder) {
                    set_attrs(folder, a & !FILE_ATTRIBUTE_READONLY)?;
                }
            }
        }
    }
    remove_icons(folder, None);
    notify_shell(folder);
    Ok(())
}
