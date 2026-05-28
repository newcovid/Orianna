// src-tauri/src/lcu.rs
use reqwest::{Client, Method};
use serde::Serialize;
use std::collections::HashMap;
use sysinfo::System;

#[derive(Serialize)]
pub struct LcuAuth {
    pub port: u16,
    pub token: String,
    pub pid: u32,
    pub region: String,
    pub rso_platform_id: String,
    pub rc_port: u16,     // [新增] Riot Client 端口
    pub rc_token: String, // [新增] Riot Client Token
}

#[tauri::command]
pub fn get_lcu_auth() -> Result<LcuAuth, String> {
    let mut sys = System::new_all();
    sys.refresh_processes();

    for (pid, process) in sys.processes() {
        if process.name().to_lowercase().contains("leagueclientux") {
            let cmd = process.cmd();
            let mut port: u16 = 0;
            let mut token = String::new();
            let mut region = String::new();
            let mut rso_platform_id = String::new();
            let mut rc_port: u16 = 0;
            let mut rc_token = String::new();

            for arg in cmd {
                if arg.starts_with("--app-port=") {
                    port = arg.replace("--app-port=", "").parse().unwrap_or(0);
                } else if arg.starts_with("--remoting-auth-token=") {
                    token = arg.replace("--remoting-auth-token=", "");
                } else if arg.starts_with("--region=") {
                    region = arg.replace("--region=", "");
                } else if arg.starts_with("--rso_platform_id=") {
                    rso_platform_id = arg.replace("--rso_platform_id=", "");
                } else if arg.starts_with("--riotclient-app-port=") {
                    rc_port = arg
                        .replace("--riotclient-app-port=", "")
                        .parse()
                        .unwrap_or(0);
                } else if arg.starts_with("--riotclient-auth-token=") {
                    rc_token = arg.replace("--riotclient-auth-token=", "");
                }
            }

            if port != 0 && !token.is_empty() {
                return Ok(LcuAuth {
                    port,
                    token,
                    pid: pid.as_u32(),
                    region,
                    rso_platform_id,
                    rc_port,
                    rc_token,
                });
            }
        }
    }

    Err("League Client is not running".to_string())
}

// LCU 本地请求
#[tauri::command]
pub async fn lcu_request(
    port: u16,
    token: String,
    method: String,
    endpoint: String,
    body: Option<String>,
) -> Result<String, String> {
    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| format!("Client build error: {}", e))?;

    let url = format!("https://127.0.0.1:{}{}", port, endpoint);
    let req_method = Method::from_bytes(method.as_bytes()).unwrap_or(Method::GET);

    let mut req = client
        .request(req_method, url)
        .basic_auth("riot", Some(token));

    if let Some(b) = body {
        req = req.header("Content-Type", "application/json").body(b);
    }

    let res = req
        .send()
        .await
        .map_err(|e| format!("LCU 网络请求失败: {}", e))?;
    let text = res
        .text()
        .await
        .map_err(|e| format!("LCU 响应解析失败: {}", e))?;

    Ok(text)
}

// [新增] Riot Client 专用本地请求
#[tauri::command]
pub async fn rc_request(
    port: u16,
    token: String,
    method: String,
    endpoint: String,
    body: Option<String>,
) -> Result<String, String> {
    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| format!("Client build error: {}", e))?;

    let url = format!("https://127.0.0.1:{}{}", port, endpoint);
    let req_method = Method::from_bytes(method.as_bytes()).unwrap_or(Method::GET);

    let mut req = client
        .request(req_method, url)
        .basic_auth("riot", Some(token)); // RC 也使用 Basic Auth "riot" 用户

    if let Some(b) = body {
        req = req.header("Content-Type", "application/json").body(b);
    }

    let res = req
        .send()
        .await
        .map_err(|e| format!("RC 网络请求失败: {}", e))?;
    let text = res
        .text()
        .await
        .map_err(|e| format!("RC 响应解析失败: {}", e))?;

    Ok(text)
}

// 万能网络代理网关（完美解决 SGP 跨域与权限问题）
#[tauri::command]
pub async fn proxy_request(
    method: String,
    url: String,
    headers: HashMap<String, String>,
    body: Option<String>,
) -> Result<String, String> {
    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| format!("Client build error: {}", e))?;

    let req_method = Method::from_bytes(method.as_bytes()).unwrap_or(Method::GET);

    let mut req = client.request(req_method, url);

    for (k, v) in headers {
        req = req.header(&k, &v);
    }

    if let Some(b) = body {
        req = req.body(b);
    }

    let res = req
        .send()
        .await
        .map_err(|e| format!("代理请求发送失败: {}", e))?;

    let status = res.status();
    let text = res
        .text()
        .await
        .map_err(|e| format!("代理响应解析失败: {}", e))?;

    if !status.is_success() {
        return Err(format!("HTTP 状态异常 {}: {}", status, text));
    }

    Ok(text)
}
