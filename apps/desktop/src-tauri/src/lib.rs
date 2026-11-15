//! Jinsei for the desktop: a window that connects to a Jinsei instance online.
//!
//! The bundled page in `ui/` asks which server to use and then calls [`connect`].
//! The window stays on that server; links to other sites open in the browser.

use std::sync::Mutex;

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::webview::NewWindowResponse;
use tauri::{AppHandle, Manager, Url, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;

/// The instance chosen on the start page.
#[derive(Default)]
struct Server(Mutex<Option<Url>>);

/// Start page bundled with the app (its address differs on Windows).
#[cfg(windows)]
const START_PAGE: &str = "http://tauri.localhost/index.html";
#[cfg(not(windows))]
const START_PAGE: &str = "tauri://localhost/index.html";

fn is_start_page(url: &Url) -> bool {
    url.scheme() == "tauri" || url.host_str() == Some("tauri.localhost")
}

fn same_origin(a: &Url, b: &Url) -> bool {
    a.scheme() == b.scheme()
        && a.host_str() == b.host_str()
        && a.port_or_known_default() == b.port_or_known_default()
}

fn open_in_browser(app: &AppHandle, url: &Url) {
    if matches!(url.scheme(), "https" | "http" | "mailto") {
        let _ = app.opener().open_url(url.as_str(), None::<&str>);
    }
}

/// True when the address answers the Jinsei API health check.
///
/// The check runs here because the instance does not allow cross-origin reads
/// (Cross-Origin-Resource-Policy), so the start page cannot fetch it directly.
#[tauri::command]
async fn check_server(url: String) -> bool {
    let Ok(base) = Url::parse(&url) else {
        return false;
    };
    if !matches!(base.scheme(), "https" | "http") {
        return false;
    }
    let Ok(health) = base.join("/api/health") else {
        return false;
    };
    tauri::async_runtime::spawn_blocking(move || {
        let agent: ureq::Agent = ureq::Agent::config_builder()
            .timeout_global(Some(std::time::Duration::from_secs(10)))
            .build()
            .into();
        agent
            .get(health.as_str())
            .call()
            .ok()
            .and_then(|mut response| response.body_mut().read_to_string().ok())
            .is_some_and(|body| body.contains("jinsei-api"))
    })
    .await
    .unwrap_or(false)
}

/// Opens the chosen instance in the main window.
#[tauri::command]
fn connect(app: AppHandle, url: String) -> Result<(), String> {
    let target = Url::parse(&url).map_err(|error| error.to_string())?;
    if !matches!(target.scheme(), "https" | "http") {
        return Err("Use an http or https address".into());
    }
    *app.state::<Server>().0.lock().unwrap() = Some(target.clone());
    let window = app
        .get_webview_window("main")
        .ok_or("The main window is not open")?;
    window.navigate(target).map_err(|error| error.to_string())
}

/// Menu labels in the system language (Portuguese, English or Spanish).
fn labels() -> [&'static str; 4] {
    let locale = sys_locale::get_locale().unwrap_or_default().to_lowercase();
    if locale.starts_with("pt") {
        ["Servidor", "Trocar servidor", "Recarregar", "Abrir no navegador"]
    } else if locale.starts_with("es") {
        ["Servidor", "Cambiar servidor", "Recargar", "Abrir en el navegador"]
    } else {
        ["Server", "Change server", "Reload", "Open in browser"]
    }
}

fn build_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let [title, change, reload, browser] = labels();
    let menu = Menu::default(app)?;
    let server = Submenu::with_items(
        app,
        title,
        true,
        &[
            &MenuItem::with_id(app, "change-server", change, true, Some("CmdOrCtrl+Shift+S"))?,
            &MenuItem::with_id(app, "reload", reload, true, Some("CmdOrCtrl+R"))?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "open-browser", browser, true, None::<&str>)?,
        ],
    )?;
    menu.append(&server)?;
    Ok(menu)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Server::default())
        .invoke_handler(tauri::generate_handler![connect, check_server])
        .setup(|app| {
            let navigation = app.handle().clone();
            let popups = app.handle().clone();
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("Jinsei")
                .inner_size(1280.0, 820.0)
                .min_inner_size(420.0, 560.0)
                .on_navigation(move |url| {
                    if is_start_page(url) {
                        return true;
                    }
                    let server = navigation.state::<Server>().0.lock().unwrap().clone();
                    if server.is_some_and(|server| same_origin(&server, url)) {
                        return true;
                    }
                    open_in_browser(&navigation, url);
                    false
                })
                .on_new_window(move |url, _features| {
                    open_in_browser(&popups, &url);
                    NewWindowResponse::Deny
                })
                .build()?;
            let menu = build_menu(app.handle())?;
            app.set_menu(menu)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            let Some(window) = app.get_webview_window("main") else {
                return;
            };
            match event.id().as_ref() {
                "change-server" => {
                    if let Ok(url) = Url::parse(&format!("{START_PAGE}?change=1")) {
                        let _ = window.navigate(url);
                    }
                }
                "reload" => {
                    let _ = window.eval("location.reload()");
                }
                "open-browser" => {
                    if let Ok(url) = window.url() {
                        if !is_start_page(&url) {
                            open_in_browser(app, &url);
                        }
                    }
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Jinsei");
}
