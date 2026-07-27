mod api;
mod store;
mod sysinfo;

use serde::Serialize;
use serde_json::Value;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconEvent},
    AppHandle, Manager, State, WindowEvent,
};
use tauri_plugin_notification::NotificationExt;

/// Estado em memória. O token fica SOMENTE no Credential Manager.
#[derive(Default)]
pub struct AgentState {
    machine: Mutex<Option<api::Machine>>,
    blocked: Mutex<Option<String>>,
}

#[derive(Serialize)]
pub struct AgentStatus {
    paired: bool,
    hostname: String,
    os_user: String,
    anydesk_id: Option<String>,
    agent_version: String,
    machine: Option<api::Machine>,
    /// mensagem de bloqueio (licença/máquina inativa) — o app mostra e não faz loop
    blocked: Option<String>,
}

fn token() -> Result<String, api::ApiError> {
    store::load_token().ok_or(api::ApiError {
        code: "unauthorized".into(),
        status: 401,
        message: "Sessão expirada. Refaça o pareamento.".into(),
    })
}

/// Trata o erro de forma centralizada: revoga token quando necessário
/// e registra bloqueios terminais no estado.
fn handle_error(app: &AppHandle, err: api::ApiError) -> api::ApiError {
    if api::should_unpair(&err.code) {
        let _ = store::clear_token();
        if let Some(state) = app.try_state::<AgentState>() {
            *state.machine.lock().unwrap() = None;
        }
    }
    if api::is_terminal(&err.code) {
        if let Some(state) = app.try_state::<AgentState>() {
            *state.blocked.lock().unwrap() = Some(err.message.clone());
        }
    }
    err
}

// ------------------------------------------------------------------ comandos

#[tauri::command]
fn get_status(state: State<'_, AgentState>) -> AgentStatus {
    AgentStatus {
        paired: store::load_token().is_some(),
        hostname: sysinfo::hostname(),
        os_user: sysinfo::os_user(),
        anydesk_id: sysinfo::anydesk_id(),
        agent_version: sysinfo::agent_version(),
        machine: state.machine.lock().unwrap().clone(),
        blocked: state.blocked.lock().unwrap().clone(),
    }
}

#[tauri::command]
async fn pair(
    app: AppHandle,
    state: State<'_, AgentState>,
    license_key: String,
) -> Result<api::Machine, api::ApiError> {
    let license_key = license_key.trim().to_string();
    if license_key.is_empty() {
        return Err(api::ApiError {
            code: "empty_license".into(),
            status: 0,
            message: "Informe a chave de licença.".into(),
        });
    }

    let result = api::pair(
        &license_key,
        &sysinfo::hostname(),
        sysinfo::anydesk_id(),
        &sysinfo::os_user(),
        &sysinfo::agent_version(),
    )
    .await
    .map_err(|e| handle_error(&app, e))?;

    store::save_token(&result.token).map_err(|e| api::ApiError {
        code: "keyring_error".into(),
        status: 0,
        message: e,
    })?;

    *state.blocked.lock().unwrap() = None;
    *state.machine.lock().unwrap() = Some(result.machine.clone());
    Ok(result.machine)
}

#[tauri::command]
fn unpair(state: State<'_, AgentState>) -> Result<(), String> {
    *state.machine.lock().unwrap() = None;
    *state.blocked.lock().unwrap() = None;
    store::clear_token()
}

#[tauri::command]
async fn categories(app: AppHandle) -> Result<Value, api::ApiError> {
    api::categories(&token()?)
        .await
        .map_err(|e| handle_error(&app, e))
}

#[tauri::command]
async fn tickets(app: AppHandle) -> Result<Value, api::ApiError> {
    api::tickets(&token()?)
        .await
        .map_err(|e| handle_error(&app, e))
}

#[tauri::command]
async fn create_ticket(app: AppHandle, ticket: api::NewTicket) -> Result<Value, api::ApiError> {
    let result = api::create_ticket(&token()?, &ticket, sysinfo::anydesk_id())
        .await
        .map_err(|e| handle_error(&app, e))?;

    let number = result
        .get("ticket")
        .and_then(|t| t.get("ticket_number"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let _ = app
        .notification()
        .builder()
        .title("Chamado aberto")
        .body(format!("Seu chamado {number} foi registrado. Acompanhe pelo chat."))
        .show();

    Ok(result)
}

#[tauri::command]
async fn messages(app: AppHandle, public_token: String) -> Result<Value, api::ApiError> {
    api::messages(&token()?, &public_token)
        .await
        .map_err(|e| handle_error(&app, e))
}

#[tauri::command]
async fn send_message(
    app: AppHandle,
    public_token: String,
    body: String,
) -> Result<Value, api::ApiError> {
    let body = body.trim().to_string();
    if body.is_empty() || body.chars().count() > 4000 {
        return Err(api::ApiError {
            code: "invalid_body".into(),
            status: 0,
            message: "A mensagem deve ter entre 1 e 4000 caracteres.".into(),
        });
    }

    api::send_message(&token()?, &public_token, &body)
        .await
        .map_err(|e| handle_error(&app, e))
}

#[tauri::command]
fn minimize_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        // A janela precisa estar visível e fora do modo "sem barra de tarefas"
        // antes de minimizar; caso contrário o Windows ignora o comando.
        let _ = window.set_skip_taskbar(false);
        if let Err(err) = window.minimize() {
            log::warn!("falha ao minimizar: {err}");
        }
    }
}

#[tauri::command]
fn hide_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

// ------------------------------------------------------------------ janela / tray

fn show_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_skip_taskbar(false);
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

/// Heartbeat de 5 minutos + recuperação do vínculo da máquina no boot.
fn spawn_heartbeat(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        loop {
            if let Some(token) = store::load_token() {
                match api::heartbeat(
                    &token,
                    sysinfo::anydesk_id(),
                    &sysinfo::os_user(),
                    &sysinfo::agent_version(),
                )
                .await
                {
                    Ok(value) => {
                        if let Some(state) = app.try_state::<AgentState>() {
                            *state.blocked.lock().unwrap() = None;
                            let hostname = value
                                .get("hostname")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string();
                            let mut machine = state.machine.lock().unwrap();
                            if machine.is_none() && !hostname.is_empty() {
                                *machine = Some(api::Machine {
                                    id: String::new(),
                                    hostname,
                                    sector: None,
                                    user_label: None,
                                });
                            }
                        }
                    }
                    Err(err) => {
                        log::warn!("heartbeat falhou: {} ({})", err.code, err.status);
                        handle_error(&app, err);
                    }
                }
            }
            tokio::time::sleep(Duration::from_secs(300)).await;
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            show_window(app);
        }))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .manage(AgentState::default())
        .invoke_handler(tauri::generate_handler![
            get_status,
            pair,
            unpair,
            categories,
            tickets,
            create_ticket,
            messages,
            send_message,
            hide_window,
            minimize_window
        ])
        .setup(|app| {
            let handle = app.handle().clone();

            // menu da bandeja
            let open = MenuItem::with_id(app, "open", "Abrir chamado", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Sair", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &quit])?;

            if let Some(tray) = app.tray_by_id("main-tray") {
                tray.set_menu(Some(menu))?;
                tray.set_show_menu_on_left_click(false)?;

                let menu_handle = handle.clone();
                tray.on_menu_event(move |_tray, event| match event.id.as_ref() {
                    "open" => show_window(&menu_handle),
                    "quit" => menu_handle.exit(0),
                    _ => {}
                });

                let click_handle = handle.clone();
                tray.on_tray_icon_event(move |_tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_window(&click_handle);
                    }
                });
            }

            // fechar = esconder na bandeja
            if let Some(window) = app.get_webview_window("main") {
                // Garante o ícone oficial na barra de tarefas, no Alt+Tab e no
                // Gerenciador de Tarefas (o Windows não herda o ícone do .exe
                // em janelas sem decoração).
                if let Some(icon) = app.default_window_icon().cloned() {
                    let _ = window.set_icon(icon);
                }
                let _ = window.set_skip_taskbar(false);

                let window_handle = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_handle.hide();
                    }
                });
            }

            // Inicia com o Windows, sempre em segundo plano (arg --minimized).
            {
                use tauri_plugin_autostart::ManagerExt;
                let _ = app.autolaunch().enable();
            }

            // Só abre a janela quando o usuário executa o app manualmente.
            let silent = std::env::args().any(|a| a == "--minimized" || a == "--hidden");
            if !silent {
                show_window(&handle);
            }

            spawn_heartbeat(handle);
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("erro ao iniciar o Corebit Agent")
        .run(|_app, event| {
            // impede que o app morra quando a janela é escondida
            if let tauri::RunEvent::ExitRequested { api, code, .. } = event {
                if code.is_none() {
                    api.prevent_exit();
                }
            }
        });
}
