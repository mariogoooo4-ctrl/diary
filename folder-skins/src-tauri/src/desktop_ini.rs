#![cfg_attr(not(windows), allow(dead_code))]
//! Pure, platform-independent editing of Windows `desktop.ini` files.
//!
//! We never throw away a user's existing settings: original icon lines are
//! kept as `; FolderSkins:prev <line>` comments and restored on revert, and
//! all other sections/keys are left untouched.

pub const ICON_PREFIX: &str = ".folderskin-";
pub const ICON_EXT: &str = ".ico";

const SECTION: &str = "[.ShellClassInfo]";
const MANAGED: &str = "; FolderSkins:managed";
const PREV: &str = "; FolderSkins:prev ";
const ICON_KEYS: [&str; 3] = ["iconresource", "iconfile", "iconindex"];

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Encoding {
    Utf8,
    Utf8Bom,
    Utf16Le,
    /// Legacy ANSI file: bytes mapped 1:1 to chars so they round-trip losslessly.
    Bytes,
}

pub fn decode(bytes: &[u8]) -> (String, Encoding) {
    if let Some(rest) = bytes.strip_prefix(&[0xFF, 0xFE]) {
        let units: Vec<u16> = rest.chunks_exact(2).map(|c| u16::from_le_bytes([c[0], c[1]])).collect();
        (String::from_utf16_lossy(&units), Encoding::Utf16Le)
    } else if let Some(rest) = bytes.strip_prefix(&[0xEF, 0xBB, 0xBF]) {
        (String::from_utf8_lossy(rest).into_owned(), Encoding::Utf8Bom)
    } else if let Ok(s) = std::str::from_utf8(bytes) {
        (s.to_owned(), Encoding::Utf8)
    } else {
        (bytes.iter().map(|&b| b as char).collect(), Encoding::Bytes)
    }
}

pub fn encode(text: &str, enc: Encoding) -> Vec<u8> {
    match enc {
        Encoding::Utf8 => text.as_bytes().to_vec(),
        Encoding::Utf8Bom => [&[0xEF, 0xBB, 0xBF][..], text.as_bytes()].concat(),
        Encoding::Utf16Le => {
            let mut out = vec![0xFF, 0xFE];
            text.encode_utf16().for_each(|u| out.extend_from_slice(&u.to_le_bytes()));
            out
        }
        // Our own additions are ASCII, so every char here is <= 0xFF.
        Encoding::Bytes => text.chars().map(|c| if (c as u32) < 256 { c as u8 } else { b'?' }).collect(),
    }
}

fn is_header(line: &str) -> bool {
    let t = line.trim();
    t.starts_with('[') && t.ends_with(']')
}

fn key_of(line: &str) -> Option<String> {
    let t = line.trim();
    if t.starts_with(';') || t.starts_with('#') {
        return None;
    }
    t.split_once('=').map(|(k, _)| k.trim().to_ascii_lowercase())
}

fn join(lines: &[String]) -> String {
    let mut s = lines.join("\r\n");
    s.push_str("\r\n");
    s
}

pub fn is_managed(text: &str) -> bool {
    text.lines().any(|l| l.trim_start().starts_with(MANAGED))
}

#[derive(Debug, PartialEq, Eq)]
pub struct Reverted {
    /// New file contents, or None if the file should be deleted.
    pub content: Option<String>,
    /// We set the folder's ReadOnly attribute ourselves and should clear it.
    pub clear_readonly: bool,
}

/// Remove everything FolderSkins added and restore the original icon lines.
pub fn revert(text: &str) -> Reverted {
    let mut out: Vec<String> = Vec::new();
    let mut clear_readonly = false;
    let mut in_section = false;
    for line in text.lines() {
        let t = line.trim();
        if is_header(t) {
            in_section = t.eq_ignore_ascii_case(SECTION);
        }
        if let Some(rest) = t.strip_prefix(MANAGED) {
            clear_readonly = rest.contains("ro=1");
            continue;
        }
        if let Some(orig) = t.strip_prefix(PREV) {
            out.push(orig.to_string());
            continue;
        }
        if in_section && key_of(t).as_deref() == Some("iconresource") {
            let value = t.split_once('=').map(|(_, v)| v.trim()).unwrap_or("");
            if value.starts_with(ICON_PREFIX) {
                continue;
            }
        }
        out.push(line.to_string());
    }
    let out = drop_empty_sections(out);
    let has_content = out.iter().any(|l| !l.trim().is_empty());
    Reverted { content: has_content.then(|| join(&out)), clear_readonly }
}

/// Point the folder at `icon_file`. `set_readonly` records that the caller is
/// about to set the folder's ReadOnly attribute (needed for Explorer to read
/// desktop.ini) so revert can undo it.
pub fn apply(existing: Option<&str>, icon_file: &str, set_readonly: bool) -> String {
    let (base, prev_ro) = match existing {
        Some(t) if is_managed(t) => {
            let r = revert(t);
            (r.content.unwrap_or_default(), r.clear_readonly)
        }
        Some(t) => (t.to_string(), false),
        None => (String::new(), false),
    };
    let ro = set_readonly || prev_ro;
    let mut lines: Vec<String> = base.lines().map(String::from).collect();
    let idx = match lines.iter().position(|l| l.trim().eq_ignore_ascii_case(SECTION)) {
        Some(i) => i,
        None => {
            if lines.last().is_some_and(|l| !l.trim().is_empty()) {
                lines.push(String::new());
            }
            lines.push(SECTION.to_string());
            lines.len() - 1
        }
    };
    let mut i = idx + 1;
    while i < lines.len() && !is_header(&lines[i]) {
        if key_of(&lines[i]).is_some_and(|k| ICON_KEYS.contains(&k.as_str())) {
            lines[i] = format!("{PREV}{}", lines[i].trim());
        }
        i += 1;
    }
    lines.insert(idx + 1, format!("{MANAGED} ro={}", u8::from(ro)));
    lines.insert(idx + 2, format!("IconResource={icon_file},0"));
    join(&lines)
}

fn drop_empty_sections(lines: Vec<String>) -> Vec<String> {
    let mut out = Vec::new();
    let mut pending: Vec<String> = Vec::new();
    let flush = |pending: &mut Vec<String>, out: &mut Vec<String>| {
        let header_only = pending.first().is_some_and(|h| is_header(h)) && pending[1..].iter().all(|l| l.trim().is_empty());
        if !header_only {
            out.append(pending);
        }
        pending.clear();
    };
    for l in lines {
        if is_header(&l) {
            flush(&mut pending, &mut out);
        }
        pending.push(l);
    }
    flush(&mut pending, &mut out);
    while out.last().is_some_and(|l| l.trim().is_empty()) {
        out.pop();
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    const ICON: &str = ".folderskin-123.ico";

    #[test]
    fn apply_to_fresh_folder_and_revert_deletes_file() {
        let s = apply(None, ICON, true);
        assert!(s.contains("[.ShellClassInfo]"));
        assert!(s.contains("IconResource=.folderskin-123.ico,0"));
        assert!(is_managed(&s));
        let r = revert(&s);
        assert_eq!(r, Reverted { content: None, clear_readonly: true });
    }

    #[test]
    fn preserves_existing_settings_and_original_icon() {
        let original = "[.ShellClassInfo]\r\nIconResource=C:\\icons\\a.ico,3\r\nInfoTip=My stuff\r\n[ViewState]\r\nMode=4\r\n";
        let s = apply(Some(original), ICON, false);
        assert!(s.contains("InfoTip=My stuff"));
        assert!(s.contains("[ViewState]"));
        assert!(s.contains("; FolderSkins:prev IconResource=C:\\icons\\a.ico,3"));
        assert_eq!(s.matches("\nIconResource=").count(), 1);

        let r = revert(&s);
        assert!(!r.clear_readonly);
        assert_eq!(r.content.unwrap(), original);
    }

    #[test]
    fn reapply_does_not_nest_and_keeps_readonly_flag() {
        let first = apply(Some("[ViewState]\r\nMode=4\r\n"), ICON, true);
        let second = apply(Some(&first), ".folderskin-456.ico", false);
        assert_eq!(second.matches(MANAGED).count(), 1);
        assert!(second.contains("ro=1"));
        assert!(second.contains(".folderskin-456.ico"));
        assert!(!second.contains(ICON));
        let r = revert(&second);
        assert!(r.clear_readonly);
        assert_eq!(r.content.unwrap(), "[ViewState]\r\nMode=4\r\n");
    }

    #[test]
    fn encodings_roundtrip() {
        for enc in [Encoding::Utf8, Encoding::Utf8Bom, Encoding::Utf16Le] {
            let text = "[.ShellClassInfo]\r\nLocalizedResourceName=Документи\r\n";
            let (back, e) = decode(&encode(text, enc));
            assert_eq!((back.as_str(), e), (text, enc));
        }
        let ansi = b"[.ShellClassInfo]\r\nInfoTip=caf\xe9\r\n".to_vec();
        let (text, enc) = decode(&ansi);
        assert_eq!(enc, Encoding::Bytes);
        assert_eq!(encode(&text, enc), ansi);
    }
}
