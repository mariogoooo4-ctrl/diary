mod commands;
mod desktop_ini;
mod error;
mod icon;
mod platform;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::platform_info,
            commands::apply_skin,
            commands::revert_skin,
            commands::read_text_file,
            commands::write_text_file,
            commands::save_icon_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running FolderSkins");
}
