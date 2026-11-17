//! macOS: set a custom icon via NSWorkspace (the same API Finder's "Get Info"
//! paste uses). We call it through JavaScript for Automation so we don't need
//! Objective-C bindings; `osascript` ships with every macOS.
use crate::error::{AppError, AppResult};
use crate::icon;
use image::RgbaImage;
use std::path::Path;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

const SET_ICON_JS: &str = r#"
function run(argv) {
  ObjC.import('AppKit');
  var img = $.NSImage.alloc.initWithContentsOfFile(argv[0]);
  if (!img || img.isNil()) { return 'error: could not load the rendered image'; }
  var ok = $.NSWorkspace.sharedWorkspace.setIconForFileOptions(img, argv[1], 0);
  return ok ? 'ok' : 'error: macOS refused to set the icon (check folder permissions)';
}"#;

const CLEAR_ICON_JS: &str = r#"
function run(argv) {
  ObjC.import('AppKit');
  var ok = $.NSWorkspace.sharedWorkspace.setIconForFileOptions(null, argv[0], 0);
  return ok ? 'ok' : 'error: macOS refused to remove the icon (check folder permissions)';
}"#;

fn run_jxa(script: &str, args: &[&str]) -> AppResult<()> {
    let out = Command::new("/usr/bin/osascript")
        .args(["-l", "JavaScript", "-e", script])
        .args(args)
        .output()?;
    let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if out.status.success() && stdout == "ok" {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&out.stderr);
        Err(AppError::Platform(format!("{stdout} {stderr}").trim().to_string()))
    }
}

pub fn apply(folder: &Path, img: &RgbaImage) -> AppResult<()> {
    let stamp = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0);
    let tmp = std::env::temp_dir().join(format!("folderskins-{}-{stamp}.png", std::process::id()));
    std::fs::write(&tmp, icon::encode_png(img, img.width().min(1024))?)?;
    let result = run_jxa(SET_ICON_JS, &[&tmp.to_string_lossy(), &folder.to_string_lossy()]);
    let _ = std::fs::remove_file(&tmp);
    result
}

pub fn revert(folder: &Path) -> AppResult<()> {
    run_jxa(CLEAR_ICON_JS, &[&folder.to_string_lossy()])
}
