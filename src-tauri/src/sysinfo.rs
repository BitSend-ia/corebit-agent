//! Coleta de identidade da máquina: hostname, usuário do Windows e ID do AnyDesk.

use std::fs;
use std::path::PathBuf;

pub fn hostname() -> String {
    hostname::get()
        .ok()
        .and_then(|h| h.into_string().ok())
        .unwrap_or_else(|| "UNKNOWN".to_string())
}

pub fn os_user() -> String {
    whoami::username()
}

pub fn agent_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Lê o ID do AnyDesk de `%ProgramData%\AnyDesk\service.conf` (ou do perfil do usuário).
pub fn anydesk_id() -> Option<String> {
    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Ok(program_data) = std::env::var("ProgramData") {
        candidates.push(PathBuf::from(&program_data).join("AnyDesk").join("service.conf"));
        candidates.push(PathBuf::from(&program_data).join("AnyDesk").join("system.conf"));
    }
    if let Ok(appdata) = std::env::var("APPDATA") {
        candidates.push(PathBuf::from(&appdata).join("AnyDesk").join("user.conf"));
        candidates.push(PathBuf::from(&appdata).join("AnyDesk").join("service.conf"));
    }

    for path in candidates {
        let Ok(content) = fs::read_to_string(&path) else { continue };
        for line in content.lines() {
            let line = line.trim();
            for key in ["ad.anynet.id=", "ad.anynet.alias="] {
                if let Some(value) = line.strip_prefix(key) {
                    let value = value.trim();
                    if !value.is_empty() {
                        return Some(value.to_string());
                    }
                }
            }
        }
    }
    None
}
