# Corebit Agent

Aplicação desktop para Windows que integra as estações de trabalho dos clientes
Corebit à Central do Cliente. Permite abrir e acompanhar chamados de suporte
diretamente da máquina, sem necessidade de acesso ao navegador.

Desenvolvido e mantido pela **Corebit Consultoria em TI**.

---

## Visão geral

O Corebit Agent é distribuído às empresas atendidas pela Corebit e ativado por
meio de uma chave de licença corporativa. Após a ativação, o agente permanece
residente na bandeja do sistema, disponível a qualquer momento para registro de
solicitações e comunicação com a equipe de suporte.

**Principais recursos**

- Abertura de chamados sem sair da estação de trabalho
- Acompanhamento e resposta às interações do suporte em tempo real
- Coleta automática de informações do equipamento para agilizar o atendimento
- Ativação por licença corporativa, com controle centralizado pelo portal
- Atualização automática de versão, sem intervenção do usuário

## Requisitos

|
 Item             
|
 Requisito                                  
|
|
----------------
|
------------------------------------------
|
|
 Sistema          
|
 Windows 10 ou superior (64 bits)           
|
|
 Runtime          
|
 Microsoft Edge WebView2 (nativo do Windows)
|
|
 Conectividade    
|
 Acesso HTTPS a 
`cliente.corebit.com.br`
|
|
 Ativação         
|
 Chave de licença fornecida pela Corebit    
|

Não é necessário instalar dependências adicionais nas estações dos clientes.

## Instalação

1. Execute o instalador (`.msi` ou `.exe`) disponibilizado pela Corebit.
2. Na primeira execução, informe a **chave de licença** da empresa.
3. Concluída a ativação, o agente passa a operar automaticamente a cada logon.

### Implantação em massa

Para distribuição via GPO, SCCM/Intune ou script de provisionamento:

```bat
msiexec /i "Corebit Agent_x64.msi" /qn
A ativação é realizada pelo usuário no primeiro acesso, utilizando a chave corporativa. Para cenários de pré-ativação, entre em contato com a equipe Corebit.

Utilização
Ícone na bandeja: clique para abrir a janela do agente.
Fechar a janela: o agente é minimizado para a bandeja e continua ativo.
Encerrar o agente: utilize a opção "Sair" no menu da bandeja.
Segurança
A segurança das credenciais e dos dados trafegados segue as práticas adotadas pela Corebit em todos os seus produtos:

O token de autenticação é armazenado no Windows Credential Manager, protegido por criptografia vinculada ao usuário do sistema operacional.
A credencial não é exposta à interface da aplicação, ao armazenamento local nem a arquivos de log.
Toda a comunicação com o portal ocorre exclusivamente via HTTPS.
Licenças e pareamentos podem ser revogados remotamente pela Corebit; o agente reconhece a revogação e bloqueia o acesso na verificação seguinte.
O pareamento é vinculado à identificação do equipamento, impedindo a reutilização da credencial em outras máquinas.
Atualizações
O agente verifica automaticamente a disponibilidade de novas versões e realiza a atualização em segundo plano, sem exigir ação do usuário ou do administrador da rede. Os instaladores são assinados digitalmente e validados antes da aplicação.

Suporte
Portal: https://cliente.corebit.com.br
Site: https://www.corebit.com.br
© Corebit Consultoria em TI. Todos os direitos reservados. Av. Paulista, 1106 — Bela Vista, São Paulo/SP — 01310-914
