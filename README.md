# Corebit Agent (Tauri v2 + Rust + React)

Aplicativo de bandeja do Windows para abrir chamados e conversar com o suporte
sem sair da máquina. Consome a API pública do portal
(`https://cliente.corebit.com.br/api/public/agent`) — contrato em `docs/AGENT_API.md` do portal.

## Como funciona

1. Primeira execução: tela de ativação → o usuário cola a **chave de licença** → `POST /pair`.
2. O `token` retornado é gravado no **Windows Credential Manager** (crate `keyring`).
   O token **nunca** chega ao WebView: todas as chamadas HTTP saem do Rust.
3. Heartbeat a cada 5 min em background; polling do chat a cada 10 s **somente** com a janela visível.
4. Fechar a janela apenas esconde o app na bandeja. Sair só pelo menu da bandeja.

## Estrutura

```
src/                    React (telas: ativação, lista, novo chamado, chat)
  api.ts                única ponte com o Rust (invoke)
src-tauri/src/
  lib.rs                comandos, bandeja, janela, heartbeat, tratamento de erro
  api.rs                cliente HTTP + tradução dos erros da API
  store.rs              Credential Manager (salvar/ler/apagar token)
  sysinfo.rs            hostname, usuário do Windows, ID do AnyDesk
```

## Rodar em desenvolvimento

Pré-requisitos **apenas na máquina do desenvolvedor**: Node 20, Rust stable,
Visual Studio Build Tools (Desktop C++) e WebView2 (já vem no Windows 10/11).

```bash
npm install
npm run tauri dev
```

> O cliente final **não** precisa de Rust nem de Node — recebe só o `.msi`/`.exe`.

## Gerar instalador

```bash
npm run tauri build
```

Saída: `src-tauri/target/release/bundle/msi/*.msi` e `.../nsis/*-setup.exe`.

## Auto-update

1. Gere o par de chaves: `npm run tauri signer generate -- -w ~/.tauri/corebit.key`
2. Cole a **chave pública** em `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`.
3. Guarde a **chave privada** e a senha em *GitHub → Settings → Secrets*:
   `TAURI_SIGNING_PRIVATE_KEY` e `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
   Nunca commite a chave privada.
4. Publique o `latest.json` gerado pelo workflow em
   `https://cliente.corebit.com.br/downloads/agent/latest.json`.

Para eliminar o alerta do SmartScreen, assine também o instalador com um
certificado **Code Signing** (EV de preferência) — configuração em
`bundle.windows.certificateThumbprint`.

## Instalação silenciosa (massa)

```bat
msiexec /i "Corebit Agent_0.1.0_x64_pt-BR.msi" /qn
```

A ativação é feita no primeiro boot pelo usuário (chave por empresa). Para
pré-ativar, distribua a chave via GPO/argumento e leia-a no `pair` antes de exibir a tela.

## Checklist de aceite

- [ ] Ícone visível na bandeja, clique esquerdo abre a janela.
- [ ] Fechar esconde; o processo continua vivo; "Sair" encerra.
- [ ] Reiniciar o Windows: app sobe oculto e continua pareado (sem pedir a chave de novo).
- [ ] Token não aparece em `localStorage`, DevTools ou arquivos de log.
- [ ] `401` apaga o token e volta à tela de ativação.
- [ ] `machine_inactive`/`license_expired` mostram a tela de bloqueio sem loop de requisições.
- [ ] Chamado aberto no app aparece na fila N1 do portal; resposta do portal aparece no chat em até 10 s.
