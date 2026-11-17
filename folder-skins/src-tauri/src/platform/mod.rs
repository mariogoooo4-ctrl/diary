//! OS-specific folder icon application. Each backend exposes:
//!   apply(folder, image) -> AppResult<()>
//!   revert(folder)       -> AppResult<()>
//! Add Linux (gio/KDE .directory) by creating linux.rs with the same API.

#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "windows")]
pub use self::windows::{apply, revert};

#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "macos")]
pub use self::macos::{apply, revert};

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
mod unsupported;
#[cfg(not(any(target_os = "windows", target_os = "macos")))]
pub use self::unsupported::{apply, revert};

pub const OS: &str = std::env::consts::OS;
pub const SUPPORTED: bool = cfg!(any(target_os = "windows", target_os = "macos"));
