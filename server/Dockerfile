# Estágio 1: 'builder' - Responsável por instalar dependências e baixar o browser
FROM node:20-slim AS builder

# Define o diretório de trabalho
WORKDIR /usr/src/app

# Instala o git, necessário para algumas dependências do npm
RUN apt-get update && apt-get install -y git

# 1. Copia os pacotes do backend usando o contexto da raiz
COPY server/package*.json ./server/
WORKDIR /usr/src/app/server
RUN npm install --legacy-peer-deps

# 2. Volta para a raiz do container e copia explicitamente o backend e a pasta Shared
WORKDIR /usr/src/app
COPY server/ ./server/
COPY Shared/ ./Shared/

# 3. Entra no server e compila (agora ele encontrará ../Shared perfeitamente)
WORKDIR /usr/src/app/server
RUN npm run build
RUN npm prune --omit=dev --legacy-peer-deps
RUN npx puppeteer browsers install chrome

# Estágio 2: 'production'
FROM node:20-slim

RUN apt-get update && apt-get install -y tini \
    ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 \
    libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgconf-2-4 \
    libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 \
    libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 \
    libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 \
    libxss1 libxtst6 lsb-release wget xdg-utils --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash nodeuser
WORKDIR /home/nodeuser/app

# 4. Copia apenas a pasta server (que agora contém a dist com os arquivos compilados de server e Shared)
COPY --from=builder --chown=nodeuser:nodeuser /usr/src/app/server ./
COPY --from=builder --chown=nodeuser:nodeuser /root/.cache/puppeteer /home/nodeuser/.cache/puppeteer

USER nodeuser

EXPOSE 3000

ENTRYPOINT ["/usr/bin/tini", "--"]

CMD ["npm", "start"]