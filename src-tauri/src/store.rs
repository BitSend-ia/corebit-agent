//! Guarda o token da máquina no Windows Credential Manager (DPAPI).
//! O token NUNCA é exposto ao WebView — só o Rust o lê para montar os headers.

use keyring::Entry;

const SERVICE: &str = "br.com.corebit.agent";
const ACCOUNT: &str = "machine_token";

fn entry() -> Result<Entry, String> {
    Entry::new(SERVICE, ACCOUNT).map_err(|e| format!("keyring: {e}"))
}

pub fn save_token(token: &str) -> Result<(), String> {
    entry()?
        .set_password(token)
        .map_err(|e| format!("keyring set: {e}"))
}

pub fn load_token() -> Option<String> {
    entry().ok()?.get_password().ok()
}

pub fn clear_token() -> Result<(), String> {
    match entry()?.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("keyring delete: {e}")),
    }
}
