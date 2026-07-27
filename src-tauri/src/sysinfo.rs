use sha2::{Digest, Sha256};
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

/// Identificador único e estável desta instalação do Windows.
#[cfg(windows)]
fn machine_guid() -> String {
    use winreg::enums::{HKEY_LOCAL_MACHINE, KEY_READ, KEY_WOW64_64KEY};
    use winreg::RegKey;

    RegKey::predef(HKEY_LOCAL_MACHINE)
        .open_subkey_with_flags(r"SOFTWARE\Microsoft\Cryptography", KEY_READ | KEY_WOW64_64KEY)
        .and_then(|key| key.get_value::<String, _>("MachineGuid"))
        .unwrap_or_default()
}

#[cfg(not(windows))]
fn machine_guid() -> String {
    String::new()
}

/// Impressão digital de hardware enviada em todas as chamadas.
pub fn fingerprint() -> String {
    let mut hasher = Sha256::new();
    hasher.update(format!("corebit|{}|{}", machine_guid(), hostname()));
    format!("{:x}", hasher.finalize())
}

/// Ler o ID do AnyDesk de `%ProgramData%\AnyDesk\service.conf` (ou do perfil do usuário).
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
