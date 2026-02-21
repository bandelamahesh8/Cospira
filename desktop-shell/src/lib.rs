use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::Manager;

#[tauri::command]
fn set_tray_status(app_handle: tauri::AppHandle, status: String) {
    let icon_name = match status.as_str() {
        "online" => "icons/online.png",
        "offline" => "icons/offline.png",
        _ => "icons/icon.png",
    };

    let resource_path = app_handle.path().resolve(icon_name, tauri::path::BaseDirectory::Resource);
    
    if let Ok(path) = resource_path {
        if let Ok(icon) = tauri::image::Image::from_path(&path) {
             if let Some(tray) = app_handle.tray_by_id("main") {
                 let _ = tray.set_icon(Some(icon));
             }
        } else {
             eprintln!("Failed to load icon from path: {:?}", path);
        }
    } else {
         eprintln!("Failed to resolve resource path for: {}", icon_name);
    }
    
    println!("Reflecting tray status: {}", status);
}

#[tauri::command]
fn show_notification(app_handle: tauri::AppHandle, title: String, body: String) {
    use tauri_plugin_notification::NotificationExt;
    app_handle.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .unwrap_or_else(|e| eprintln!("Failed to show notification: {}", e));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_log::Builder::default().build())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![set_tray_status, show_notification])
    .setup(|app| {


      let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
      let show_i = MenuItem::with_id(app, "show", "Open Cospira", true, None::<&str>)?;
      let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

      let _tray = TrayIconBuilder::with_id("main")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .on_menu_event(|app, event| {
          match event.id.as_ref() {
            "quit" => {
              app.exit(0);
            }
            "show" => {
              if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
              }
            }
            _ => {}
          }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { .. } = event {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
