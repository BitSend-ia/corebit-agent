//! Base: https://cliente.corebit.com.br/api/public/agent

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::Duration;

pub const BASE_URL: &str = "https://cliente.corebit.com.br/api/public/agent";

#[derive(Debug, Serialize, Clone)]
pub struct ApiError {
    /// código lógico devolvido pela API (invalid_license, machine_inactive, ...)
    pub code: String,
    /// status HTTP (0 = falha de rede)
    pub status: u16,
    /// mensagem já traduzida para o usuário final
    pub message: String,
}

impl ApiError {
    fn network(err: impl std::fmt::Display) -> Self {
        Self {
            code: "network_error".into(),
            status: 0,
            message: format!("Sem conexão com o portal ({err})."),
        }
    }
}

/// `true` quando o agente deve apagar o token e voltar ao pareamento.
pub fn should_unpair(code: &str) -> bool {
    matches!(
        code,
        "unauthorized" | "invalid_token" | "token_revoked" | "fingerprint_mismatch"
    )
}

/// `true` quando não adianta repetir a chamada (estado precisa de ação humana).
pub fn is_terminal(code: &str) -> bool {
    matches!(
        code,
        "machine_inactive"
            | "license_inactive"
            | "license_expired"
            | "license_without_agent_user"
            | "machine_not_registered"
            | "machine_limit_reached"
            | "fingerprint_mismatch"
    )
}

fn humanize(code: &str, status: u16) -> String {
    match code {
        "invalid_license" => "Chave de licença inválida.".into(),
        "license_expired" => "Licença vencida. Contate o suporte da Corebit.".into(),
        "license_inactive" => "Licença bloqueada. Contate o suporte da Corebit.".into(),
        "license_without_agent_user" => {
            "A licença está sem usuário responsável. Contate o suporte da Corebit.".into()
        }
        "machine_not_registered" => {
            "Este computador não está cadastrado no portal. Contate o suporte da Corebit.".into()
        }
        "machine_limit_reached" => "Limite de máquinas da licença atingido.".into(),
        "machine_inactive" => "Este computador foi desativado no portal.".into(),
        "fingerprint_mismatch" => {
            "Esta ativação pertence a outro computador. Ative com uma nova licença.".into()
        }
        "unauthorized" => "O acesso deste computador foi revogado. Ative com uma nova licença.".into(),
        "ticket_closed" => "Este chamado foi encerrado e não aceita novas mensagens.".into(),
        "rate_limited" => "Muitas tentativas. Aguarde alguns minutos e tente novamente.".into(),
        _ => format!("Erro inesperado do servidor (HTTP {status})."),
    }
}

fn client() -> Result<reqwest::Client, ApiError> {
    // A impressão digital vai em TODA requisição: o portal recusa o token
    // se ele for copiado para outra máquina.
    let mut headers = reqwest::header::HeaderMap::new();
    if let Ok(value) = reqwest::header::HeaderValue::from_str(&crate::sysinfo::fingerprint()) {
        headers.insert("x-machine-fingerprint", value);
    }

    reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .default_headers(headers)
        .user_agent(format!("CorebitAgent/{}", env!("CARGO_PKG_VERSION")))
        .build()
        .map_err(ApiError::network)
}

async fn parse(response: reqwest::Response) -> Result<Value, ApiError> {
    let status = response.status();
    let text = response.text().await.map_err(ApiError::network)?;
    let body: Value = serde_json::from_str(&text).unwrap_or(Value::Null);

    if status.is_success() {
        return Ok(body);
    }

    let code = body
        .get("error")
        .and_then(|v| v.as_str())
        .or_else(|| body.get("code").and_then(|v| v.as_str()))
        .unwrap_or("unknown_error")
        .to_string();

    Err(ApiError {
        message: body
            .get("message")
            .and_then(|v| v.as_str())
            .map(str::to_string)
            .unwrap_or_else(|| humanize(&code, status.as_u16())),
        code,
        status: status.as_u16(),
    })
}

async fn get(token: &str, path: &str) -> Result<Value, ApiError> {
    let response = client()?
        .get(format!("{BASE_URL}{path}"))
        .bearer_auth(token)
        .send()
        .await
        .map_err(ApiError::network)?;
    parse(response).await
}

async fn post(token: Option<&str>, path: &str, body: Value) -> Result<Value, ApiError> {
    let mut request = client()?.post(format!("{BASE_URL}{path}")).json(&body);
    if let Some(token) = token {
        request = request.bearer_auth(token);
    }
    let response = request.send().await.map_err(ApiError::network)?;
    parse(response).await
}

// ---------------------------------------------------------------- modelos

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Machine {
    pub id: String,
    pub hostname: String,
    #[serde(default)]
    pub sector: Option<String>,
    #[serde(default)]
    pub user_label: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PairResponse {
    pub token: String,
    pub machine: Machine,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct NewTicket {
    pub category_id: String,
    pub description: String,
    pub impact: String,
    pub urgency: String,
}

// ---------------------------------------------------------------- chamadas

pub async fn pair(
    license_key: &str,
    hostname: &str,
    anydesk_id: Option<String>,
    os_user: &str,
    agent_version: &str,
) -> Result<PairResponse, ApiError> {
    let body = json!({
        "license_key": license_key,
        "hostname": hostname,
        "anydesk_id": anydesk_id,
        "os_user": os_user,
        "agent_version": agent_version,
        "fingerprint": crate::sysinfo::fingerprint(),
    });
    let value = post(None, "/pair", body).await?;
    serde_json::from_value(value).map_err(|e| ApiError {
        code: "bad_response".into(),
        status: 200,
        message: format!("Resposta inesperada do servidor: {e}"),
    })
}

pub async fn heartbeat(
    token: &str,
    anydesk_id: Option<String>,
    os_user: &str,
    agent_version: &str,
) -> Result<Value, ApiError> {
    let body = json!({
        "anydesk_id": anydesk_id,
        "os_user": os_user,
        "agent_version": agent_version,
    });
    post(Some(token), "/heartbeat", body).await
}

pub async fn categories(token: &str) -> Result<Value, ApiError> {
    get(token, "/categories").await
}

pub async fn tickets(token: &str) -> Result<Value, ApiError> {
    get(token, "/tickets").await
}

pub async fn create_ticket(
    token: &str,
    ticket: &NewTicket,
    anydesk_id: Option<String>,
) -> Result<Value, ApiError> {
    let body = json!({
        "category_id": ticket.category_id,
        "description": ticket.description,
        "impact": ticket.impact,
        "urgency": ticket.urgency,
        "anydesk_id": anydesk_id,
    });
    post(Some(token), "/tickets", body).await
}

pub async fn messages(token: &str, public_token: &str) -> Result<Value, ApiError> {
    get(token, &format!("/tickets/{public_token}/messages")).await
}

pub async fn send_message(token: &str, public_token: &str, body: &str) -> Result<Value, ApiError> {
    post(
        Some(token),
        &format!("/tickets/{public_token}/messages"),
        json!({ "body": body }),
    )
    .await
}
