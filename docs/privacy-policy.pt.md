# Política de Privacidade — TabAla

**Data de vigência:** 8 de fevereiro de 2026

## Resumo

O TabAla **não coleta, transmite ou compartilha** nenhum dado pessoal. Todos os dados são armazenados localmente no navegador do usuário.

## Dados armazenados

A extensão armazena **apenas** dados que o usuário escolhe salvar explicitamente:

- **URLs** das abas salvas pelo usuário
- **Títulos** das páginas salvas
- **Favicons** das páginas salvas
- **Coleções** (pastas de organização criadas pelo usuário)
- **Workspaces** (agrupamentos de coleções)
- **Preferências** do usuário (tema, configuração de nova aba)

Todos esses dados ficam armazenados **exclusivamente** no `chrome.storage.local`, no navegador do usuário. Nenhum dado é enviado para servidores externos.

## Busca por assunto (tradução no próprio computador)

Quando o usuário ativa a busca por assunto, o texto digitado na busca do TabAla é traduzido para o inglês pelo tradutor embutido no Chrome, que roda no próprio computador. Só o texto da busca vai para esse tradutor local; os links salvos não. Nada é enviado para servidores externos. A opção vem desligada e pode ser desligada a qualquer momento em Configurações.

## Próximos passos e Foco (recomendações)

Para sugerir o que abrir, ler ou resolver em seguida, o TabAla guarda no seu computador, junto dos links:

- quando você concluiu, adiou ou marcou um link como referência, e quando respondeu "ainda vale" na triagem;
- quantas vezes e em que dias você abriu um link salvo pelo próprio TabAla;
- em que dias a faixa "Próximos passos" mostrou cada link, e contagens por semana (quantos foram mostrados, abertos, adiados, descartados).

Esses dados ficam só em `chrome.storage.local`, nunca saem do navegador e não entram no arquivo de exportação. Você pode apagá-los em Configurações → Dados → "Apagar dados de uso"; os links continuam. A faixa pode ser desligada em Configurações.

Com "Aprender com o que eu abro" ligado (padrão), o TabAla também percebe, pela permissão `tabs` que já usa, quando uma aba abre um link salvo — por qualquer caminho — e por quanto tempo ela fica ativa numa janela em foco (no máximo 30 minutos por visita). Com isso ele pergunta "concluído?" depois de uma visita longa, aprende quanto tempo cada tipo de link leva e marca com um ponto o ícone da extensão numa aba de link salvo. Endereços que não estão salvos são comparados na memória e descartados; abas anônimas nunca são lidas. Desligar em Configurações para de registrar.

## Dados não coletados

A extensão **não coleta**:

- Informações de identificação pessoal
- Histórico de navegação (apenas URLs que o usuário salva explicitamente)
- Dados de localização
- Informações financeiras
- Credenciais de autenticação
- Conteúdo de páginas visitadas

## Permissões utilizadas

| Permissão | Finalidade |
|---|---|
| `storage` | Salvar e recuperar links, coleções, workspaces e preferências no armazenamento local do navegador |
| `tabs` | Obter URL e título da aba ativa, listar abas abertas, abrir e fechar abas e reconhecer quando uma aba abre um link salvo |
| `tabGroups` | Consultar grupos de abas nativos para permitir salvar abas de um grupo como coleção |
| `activeTab` | Acessar de forma segura apenas a aba que o usuário está visualizando no momento |

## Analytics e rastreamento

A extensão **não utiliza**:

- Google Analytics ou qualquer serviço de analytics
- Pixels de rastreamento
- Telemetria
- Cookies de terceiros
- Código remoto (todo o código é empacotado no bundle da extensão)

## Compartilhamento com terceiros

A extensão **não compartilha** dados com terceiros. Nenhum dado sai do navegador do usuário.

## Alterações nesta política

Eventuais alterações nesta política serão publicadas neste mesmo documento, com atualização da data de vigência.

## Contato

Para dúvidas sobre esta política de privacidade, abra uma issue no repositório:
https://github.com/vinimlo/tabAla/issues

[English version](./privacy-policy.md)
