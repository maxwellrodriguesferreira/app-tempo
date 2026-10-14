# ==============================================================================
# ESTÁGIO 1: Instalação de Dependências
# ==============================================================================
FROM node:22-alpine AS deps
WORKDIR /app

# Instala ferramentas necessárias para dependências com scripts de build
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci

# ==============================================================================
# ESTÁGIO 2: Compilação de Frontend e Backend
# ==============================================================================
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Compila o frontend React (para dist/client) e o backend Hono (para dist/server)
ENV NODE_ENV=production
RUN npm run build

# Limpa devDependencies mantendo apenas pacotes de produção
RUN npm prune --omit=dev

# ==============================================================================
# ESTÁGIO 3: Imagem Final de Produção (Container Único)
# ==============================================================================
FROM node:22-alpine AS runner
WORKDIR /app

# Configurações de ambiente de produção
ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0

# Instala curl ou wget para healthcheck robusto
RUN apk add --no-cache wget

# Cria diretórios necessários e ajusta permissões para usuário não privilegiado 'node'
RUN mkdir -p /app/dist && chown -R node:node /app

# Copia apenas os artefatos compilados e dependências de produção
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/migrations ./migrations

# Execução com usuário sem privilégios de root (segurança operacional)
USER node

# Exposição da porta única da aplicação
EXPOSE 8080

# Healthcheck funcional com wget contra o endpoint de integridade do backend
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/api/v1/health || exit 1

# Comando de inicialização do processo único HTTP
CMD ["node", "dist/server/server/index.js"]
