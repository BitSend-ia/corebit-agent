<div align="center">

# Corebit Agent

**Suporte de TI a um clique, direto da estação de trabalho.**

[![Plataforma](https://img.shields.io/badge/Plataforma-Windows%2010%2B-0b1220)](#requisitos)
[![Portal](https://img.shields.io/badge/Portal-cliente.corebit.com.br-2dff98)](https://cliente.corebit.com.br)
[![Corebit](https://img.shields.io/badge/Corebit-Consultoria%20em%20TI-1E8C57)](https://www.corebit.com.br)

</div>

---

## Sumário

- [Visão geral](#visão-geral)
- [Recursos](#recursos)
- [Requisitos](#requisitos)
- [Instalação](#instalação)
  - [Instalação individual](#instalação-individual)
  - [Implantação em massa](#implantação-em-massa)
- [Utilização](#utilização)
- [Segurança](#segurança)
- [Atualizações](#atualizações)
- [Solução de problemas](#solução-de-problemas)
- [Suporte](#suporte)

---

## Visão geral

O **Corebit Agent** é a aplicação desktop oficial da Corebit Consultoria em TI.
Ela integra as estações de trabalho dos clientes à **Central do Cliente**,
permitindo abrir e acompanhar chamados de suporte sem depender do navegador.

O agente é distribuído às empresas atendidas pela Corebit e ativado por uma
chave de licença corporativa. Após a ativação, permanece residente na bandeja
do sistema, pronto para uso a qualquer momento.

---

## Recursos

| Recurso | Descrição |
| :-- | :-- |
| **Abertura de chamados** | Registro de solicitações sem sair da estação de trabalho. |
| **Acompanhamento em tempo real** | Interações com a equipe de suporte dentro do próprio agente. |
| **Coleta automática de dados** | Informações do equipamento enviadas junto ao chamado para agilizar o atendimento. |
| **Licenciamento corporativo** | Ativação por chave, com controle centralizado pela Corebit. |
| **Atualização automática** | Novas versões aplicadas em segundo plano, sem intervenção do usuário. |
| **Operação em bandeja** | Sempre disponível, sem ocupar espaço na área de trabalho. |

---

## Requisitos

| Item | Requisito |
| :-- | :-- |
| Sistema operacional | Windows 10 ou superior (64 bits) |
| Runtime | Microsoft Edge WebView2 (nativo do Windows 10/11) |
| Conectividade | Acesso HTTPS a `cliente.corebit.com.br` |
| Ativação | Chave de licença fornecida pela Corebit |

> **Nota:** nenhuma dependência adicional precisa ser instalada nas estações dos clientes.

---

## Instalação

### Instalação individual

1. Execute o instalador (`.msi` ou `.exe`) disponibilizado pela Corebit.
2. Na primeira execução, informe a **chave de licença** da empresa.
3. Concluída a ativação, o agente passa a iniciar automaticamente a cada logon.

### Implantação em massa

Para distribuição via GPO, SCCM/Intune ou script de provisionamento:

```bat
msiexec /i "Corebit Agent_x64.msi" /qn
```

A ativação é realizada pelo usuário no primeiro acesso, com a chave corporativa.
Para cenários de pré-ativação, entre em contato com a equipe Corebit.

---

## Utilização

| Ação | Comportamento |
| :-- | :-- |
| Clique no ícone da bandeja | Abre a janela do agente. |
| Fechar a janela | Minimiza para a bandeja; o agente continua ativo. |
| Menu da bandeja → **Sair** | Encerra completamente o agente. |

---

## Segurança

A proteção das credenciais e dos dados trafegados segue as práticas adotadas
pela Corebit em todos os seus produtos:

- **Armazenamento protegido** — o token de autenticação é mantido no
  Windows Credential Manager, com criptografia vinculada ao usuário do sistema.
- **Isolamento da credencial** — não é exposta à interface, ao armazenamento
  local nem a arquivos de log.
- **Tráfego criptografado** — toda a comunicação com o portal ocorre via HTTPS.
- **Revogação remota** — licenças e pareamentos podem ser revogados pela Corebit;
  o agente reconhece a revogação e bloqueia o acesso na verificação seguinte.
- **Vínculo com o equipamento** — o pareamento é associado à identificação da
  máquina, impedindo a reutilização da credencial em outros dispositivos.

---

## Atualizações

O agente verifica automaticamente a disponibilidade de novas versões e aplica a
atualização em segundo plano, sem exigir ação do usuário ou do administrador de
rede. Os instaladores são assinados digitalmente e validados antes da instalação.

---

## Solução de problemas

| Situação | Como proceder |
| :-- | :-- |
| Chave de licença recusada | Confirme a chave com o responsável pelo contrato ou acione o suporte. |
| Tela de bloqueio exibida | O pareamento foi revogado ou a licença expirou; use **Ativar com outra licença** ou contate a Corebit. |
| Agente não aparece na bandeja | Verifique os ícones ocultos da barra de tarefas e se o agente está entre os aplicativos de inicialização. |
| Falha de conexão | Libere o acesso HTTPS a `cliente.corebit.com.br` no firewall ou proxy corporativo. |

---

## Suporte

| Canal | Endereço |
| :-- | :-- |
| Portal do cliente | <https://cliente.corebit.com.br> |
| Site institucional | <https://www.corebit.com.br> |
| WhatsApp | <https://wa.me/551150269135> |

---

<div align="center">

© Corebit Consultoria em TI. Todos os direitos reservados.<br>
Av. Paulista, 1106 — Bela Vista, São Paulo/SP — 01310-914

</div>
