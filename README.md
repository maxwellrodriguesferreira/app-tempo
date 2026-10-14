# Weather Hub — Sistema de Previsão Meteorológica & Telemetria
## Arquitetura de Produção em Container Único Docker

O **Weather Hub** (ClimaStack) é uma plataforma corporativa de telemetria e previsão meteorológica projetada para operar em **um único container Docker**, unificando frontend e backend sob a mesma porta HTTP (`8080`) e na mesma origem, com persistência no **Cloudflare D1** e proteção contra ataques de força bruta gerenciada por **Redis Remoto**.

O design do frontend é baseado integralmente no sistema de design **Safe Telemetry & Atmosphere** do Stitch.

---

## 1. Arquitetura da Solução

- **Frontend:** React 18 + TypeScript + Tailwind CSS (Safe Telemetry Design System, fontes Inter e JetBrains Mono).
- **Backend:** Hono v4 + TypeScript em runtime Node.js LTS (servidor `@hono/node-server`).
- **Banco de Dados:** Cloudflare D1 (banco gerenciado externo sem dependência local).
- **Cache & Rate Limiting:** Redis Remoto com TLS (`rediss://`), algoritmo sliding window e bloqueio atômico contra brute-force.
- **Processo Único:** Frontend compilado e servido pelo próprio servidor Hono. A API REST está disponível sob `/api/v1` e as rotas válidas de navegação retornam a Single Page Application (SPA), sem transformar erros de API em respostas HTML.
- **Container Único:** Não existem containers auxiliares para frontend, Nginx, Redis ou banco de dados. Uma única porta publicada (`8080`).

---

## 2. Compatibilidade com Cloudflare D1

Como a aplicação é executada em container Docker fora do ecossistema de Workers nativo da Cloudflare, o binding local `env.DB` não está presente. Para garantir compatibilidade com o D1, o Weather Hub implementa a camada `DatabaseAdapter` com dois modos de comunicação externa segura:

### Opção A: Worker Proxy Dedicado (Recomendado)
Um serviço Cloudflare Worker intermediário atua como um gateway privado autenticado com token Bearer, executando as consultas diretamente no D1:
- `D1_API_URL`: URL do Worker (ex: `https://weather-hub-d1-proxy.example.workers.dev`)
- `D1_API_TOKEN`: Token secreto compartilhado via Bearer Token.

O código de referência para implantação desse Worker está disponível na pasta [`worker/index.ts`](file:///home/maxwell/app-tempo/worker/index.ts) e [`worker/wrangler.toml.example`](file:///home/maxwell/app-tempo/worker/wrangler.toml.example).

### Opção B: Cloudflare D1 REST API Oficial
A aplicação pode se comunicar diretamente com a API REST da Cloudflare:
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_D1_DATABASE_ID`
- `CLOUDFLARE_API_TOKEN`

### Como Criar o Banco e Aplicar Migrations

1. Crie o banco de dados D1 via Wrangler CLI:
   ```bash
   npx wrangler d1 create weather-hub-db
   ```
2. Aplique a migração de schema inicial:
   ```bash
   npm run db:migrate
   ```
   Ou diretamente via Wrangler:
   ```bash
   npx wrangler d1 execute weather-hub-db --remote --file=./migrations/0001_initial_schema.sql
   ```

> As migrations não são executadas automaticamente na inicialização do container para manter a inicialização determinística e segura.

---

## 3. Redis Remoto & Proteção contra Brute-Force

O backend conecta-se a um Redis externo gerenciado (Upstash, Redis Cloud, Aiven, etc.) via `REDIS_URL`.

- **Conexão Segura:** Suporte automático a TLS (`rediss://`).
- **Sliding Window:** Limite de 5 tentativas de login por identificador/IP em uma janela de 60 segundos.
- **Lockout Atômico:** Ao atingir 5 falhas consecutivas, um script Lua atômico cria a chave de quarentena com TTL de 15 minutos (900s).
- **Tolerância a Falhas:** Caso o Redis fique temporariamente inacessível, a aplicação ativa automaticamente um fallback gracioso em memória sem derrubar o container.
- **Sanitização:** Credenciais e senhas do Redis são mascaradas antes de qualquer saída de log.

---

## 4. Estrutura de Arquivos

```
.
├── Dockerfile                  # Build multi-stage para container único
├── compose.yaml                # Orquestração contendo apenas o serviço weather-hub
├── .dockerignore               # Bloqueio de arquivos temporários e segredos
├── .env.example                # Template de variáveis de ambiente
├── migrations/
│   └── 0001_initial_schema.sql # Schema D1 (users, sessions, favorites, audit_logs)
├── scripts/
│   └── migrate.ts              # Script para execução controlada de migrations
├── worker/
│   ├── index.ts                # Cloudflare Worker Gateway dedicado para D1
│   └── wrangler.toml.example   # Configuração do Worker
├── src/
│   ├── server/                 # Backend Hono
│   │   ├── index.ts            # Servidor HTTP unificado (API + SPA)
│   │   ├── config.ts           # Validação Zod e sanitização de logs
│   │   ├── db/adapter.ts       # Adaptadores D1 / Worker / Fallback
│   │   ├── redis/client.ts     # Cliente Redis remoto resiliente com TLS
│   │   ├── redis/rate-limit.ts # Sliding window e lockout atômico
│   │   └── routes/             # Rotas /api/v1 (auth, users, weather, telemetry, health)
│   └── client/                 # Frontend React (Stitch Safe Telemetry)
│       ├── pages/WeatherPage.tsx        # Previsão & Clima - Dashboard ClimaStack
│       ├── pages/AuthPage.tsx           # Acesso & Segurança - Login e Defesa Redis
│       ├── pages/AdminPage.tsx          # Painel Administrativo - IAM e Auditoria
│       └── pages/InfrastructurePage.tsx # Infraestrutura & Logs em Tempo Real
└── tests/                      # Suíte de testes com Vitest
```

---

## 5. Como Executar a Aplicação

### Pré-requisitos
- Docker 24+ ou Docker Compose V2.
- Arquivo `.env` configurado (copiado de `.env.example`).

### Opção 1: Via Docker CLI Direto

1. Construir a imagem Docker:
   ```bash
   docker build -t weather-hub .
   ```

2. Executar o container:
   ```bash
   docker run -d \
     --name weather-hub \
     --env-file .env \
     -p 8080:8080 \
     --restart unless-stopped \
     weather-hub
   ```

### Opção 2: Via Docker Compose

```bash
docker compose up -d --build
```

### Verificação de Saúde
```bash
docker ps
curl http://localhost:8080/api/v1/health
```

---

## 6. Credenciais Iniciais de Demonstração

Para avaliar o sistema imediatamente:
- **Administrador Padrão:** `carlos.mendes@climastack.io`
- **Senha:** `Admin123!`
- **Painel:** Permissões completas de IAM, visualização de estatísticas, alteração de papéis e logs de auditoria.

---

## 7. Resultados dos Testes Automatizados

A suíte de testes do projeto foi executada com **Vitest**, validando a integridade do sistema:

- `tests/health.test.ts`: Valida healthcheck (`200 OK`), telemetria do container único, porta 8080, respostas 404 estritas em JSON para `/api/*` e entrega do `index.html` para rotas SPA.
- `tests/auth.test.ts`: Valida hashing criptográfico scrypt com salt de 16B e chave de 64B, timingSafeEqual, criação, validação e revogação de sessões.
- `tests/rate-limit.test.ts`: Valida contadores de sliding window, lockout atômico após 5 tentativas e liberação após reset.
- `tests/weather.test.ts`: Valida consumo da API de previsão meteorológica com 24h horárias, 7 dias e autocompletar de cidades.
