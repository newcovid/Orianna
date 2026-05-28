// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod lcu;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            lcu::get_lcu_auth,
            lcu::lcu_request,
            lcu::rc_request, // [新增] 暴露给前端 RC 代理层
            lcu::proxy_request
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
