use crate::error::{AppError, AppResult};
use image::RgbaImage;
use std::path::Path;

pub fn apply(_folder: &Path, _img: &RgbaImage) -> AppResult<()> {
    Err(AppError::Unsupported)
}

pub fn revert(_folder: &Path) -> AppResult<()> {
    Err(AppError::Unsupported)
}
