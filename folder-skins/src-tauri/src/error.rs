use serde::{Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("{0}")]
    Io(#[from] std::io::Error),
    #[error("image error: {0}")]
    Image(#[from] image::ImageError),
    #[error("invalid input: {0}")]
    Invalid(String),
    #[error("applying folder icons is not supported on this platform")]
    #[allow(dead_code)] // only constructed on platforms without an implementation
    Unsupported,
    #[error("{0}")]
    Platform(String),
}

/// Errors cross the IPC boundary as plain strings the UI can show.
impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
