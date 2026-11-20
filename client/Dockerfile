# Estágio 1: Build da aplicação React
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .

# --- ADICIONE ESTA SEÇÃO ---
# Declare os argumentos que serão recebidos do docker-compose
ARG NODE_ENV
ARG GENERATE_SOURCEMAP
ARG VITE_API_INICIO
ARG VITE_API_SITE
ARG VITE_API_BASE_URL
ARG VITE_API_SOCKET
ARG VITE_API_SUCCESS_URL
ARG VITE_API_EFI_ENVIRONMENT
ARG VITE_API_EFI_ACCOUNT
ARG VITE_RECAPTCHA_SITE_KEY

# Exponha-os como variáveis de ambiente para o comando de build
ENV NODE_ENV=$NODE_ENV
ENV GENERATE_SOURCEMAP=$GENERATE_SOURCEMAP
ENV VITE_API_INICIO=$VITE_API_INICIO
ENV VITE_API_SITE=$VITE_API_SITE
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_API_SOCKET=$VITE_API_SOCKET
ENV VITE_API_SUCCESS_URL=$VITE_API_SUCCESS_URL
ENV VITE_API_EFI_ENVIRONMENT=$VITE_API_EFI_ENVIRONMENT
ENV VITE_API_EFI_ACCOUNT=$VITE_API_EFI_ACCOUNT
ENV VITE_RECAPTCHA_SITE_KEY=$VITE_RECAPTCHA_SITE_KEY
# --- FIM DA SEÇÃO NOVA ---

RUN npm run build

# Estágio 2: Servidor de produção com Nginx
FROM nginx:stable-alpine AS production
# Copia os arquivos estáticos gerados para o diretório do Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia uma configuração customizada do Nginx, se necessário (opcional)
# --- GARANTA QUE ESTAS DUAS LINHAS EXISTEM E NÃO ESTÃO COMENTADAS ---
# Remove a configuração padrão do Nginx.
RUN rm /etc/nginx/conf.d/default.conf
# Copia a nossa configuração customizada (com a lógica do SPA).
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
