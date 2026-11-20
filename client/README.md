# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

# Criando APK

## PRODUÇÃO
Para o app funcionar no celular (4G/Wi-Fi), ele precisa saber onde está seu servidor (server).

* Vá no seu repositório no GitHub.

* Clique em *Settings* (Configurações, na barra superior).

No menu lateral esquerdo, vá em *Secrets* and *variables > Actions*.

Clique no botão verde *New repository secret*.

Preencha:

`Name: VITE_API_BASE_URL`

`Value: A URL do seu servidor.`

Se você já tem o servidor hospedado: Coloque a URL (ex: `https://pif.cognacare.com/api`).

Se você SÓ tem o servidor local: Você precisará usar o _ngrok_ ou descobrir o IP da sua rede local (ex: http://192.168.15.10:3077) e colocar aqui. Atenção: Se usar IP local, o celular precisa estar no mesmo Wi-Fi do notebook.

###  Disparar e Testar
Commit e Push: Salve tudo, faça o commit ("Configurando App Mobile") e dê o git push.

Acompanhar: Vá na aba _Actions_ do seu GitHub. Você verá o processo _"Build Android Debug APK"_ rodando. Deve levar uns 4 a 6 minutos.

**Baixar**: Quando ficar verde (sucesso), clique no nome do workflow. _Role até o final da página. Haverá uma seção Artifacts_. Clique em cognacare-debug para baixar o zip.

**Instalar**: Descompacte o zip, envie o arquivo .apk para seu celular (via WhatsApp, Drive ou cabo) e instale. O Android vai avisar que é de "Fonte Desconhecida" (pois é um APK de teste/debug). Pode aceitar.

## DESENVOLVIMENTO
**TERMINAL 1**
npm start

**TERMINAL 2**
npm run dev

O terminal deve mostrar agora algo como:

  VITE v6.2.6  ready in 434 ms

  ➜  Local:   http://localhost:5000/
  ➜  Network: http://192.168.99.114:5000/
  ➜  press h + enter to show help

* Use o endereço `Network`no navegador do celular (conectado ao mesmo Wi-Fi) para testar.

# Criando ícone para o APK (https://www.youtube.com/watch?v=nk6bKXJ3T3U)

## Passo 1: Ícones e Tela de Abertura (Splash Screen)
Provavelmente o app instalou com o ícone padrão do Capacitor (um triângulo ou "C") e uma tela branca de abertura. Vamos colocar a marca do Cognacare.

O Capacitor tem uma ferramenta mágica que gera todos os tamanhos de ícones (para Android e iOS) automaticamente.

### Prepare as imagens:

Você precisa de um ícone quadrado (pelo menos 1024x1024px, PNG). Pode usar o fs-icon.png que vi na sua estrutura, mas idealmente com resolução alta.

Você precisa de uma tela de splash (pelo menos 2732x2732px, PNG). Pode ser o logo centralizado em um fundo de cor única.

Crie a pasta de assets: Na pasta client, crie uma pasta chamada assets (se não existir) e dentro dela crie outra pasta resources.

Coloque o ícone renomeado como icon.png.

Coloque o splash renomeado como splash.png.

(Se tiver icon-foreground.png e icon-background.png para ícones adaptativos do Android, melhor ainda, mas o icon.png simples resolve).

### Instale e Gere: No terminal do VS Code (cd client):

`npm install @capacitor/assets --save-dev`
`npx capacitor-assets generate --android`

Isso vai substituir automaticamente todos os ícones genéricos dentro da pasta android pelos seus.

### Suba para o GitHub:

Faça o commit e push. O próximo APK gerado já virá com sua marca.

## Passo 2: Definir Versão e Nome (Versioning)
Para gerenciar atualizações ("Essa é a versão 1.0 ou 1.1?"), você deve manter o controle dos números.

No package.json (dentro de client): Mantenha o campo "version": "1.0.0" atualizado.

No Android (Automático): O Capacitor tenta sincronizar a versão do package.json com o Android, mas para garantir, você pode editar o arquivo client/android/app/build.gradle (procure por versionCode e versionName) se precisar forçar uma mudança.

Regra de Ouro: Para subir uma atualização na Play Store no futuro, o versionCode sempre tem que ser maior que o anterior (1, 2, 3...).

### Passo 3: Entender a Diferença "Debug" vs "Release" (O Grande Passo Final)
O arquivo que você baixou é um APK de Debug.

Serve para: Testes internos, enviar por WhatsApp para amigos, instalar no seu próprio celular.

Não serve para: Play Store (o Google rejeita APKs de debug) e tem desempenho levemente inferior (pois roda com logs ativados).

Quando você decidir publicar na Google Play Store, precisaremos:

Gerar uma Chave de Assinatura (Keystore) (um arquivo secreto que prova que você é o dono do app).

Configurar o GitHub Actions para usar essa chave e gerar um AAB (Android App Bundle) em modo Release, não Debug.

Minha recomendação: Por enquanto, fique no modo Debug. Distribua esse APK para as pessoas de confiança testarem. Quando o Prefeito ou a equipe validarem e disserem "Vamos lançar para a população", aí sim configuramos o passo de "Release" e assinatura.

Resumo da sua Rotina de Atualização agora:
Sempre que você melhorar o código do site ou corrigir um bug:

Edite o código no VS Code.

Faça Commit e Push para o GitHub.

Para Web: Seu Docker/Servidor (se configurado com CI/CD) atualiza o site.

Para App: O GitHub Actions vai gerar um novo APK automaticamente. Você baixa o novo zip, envia para o celular e instala por cima do antigo (ele atualiza mantendo os dados de login).

# GOOGLE PLPAY STORE
O GitHub (onde está o código) e a Google Play Store (onde está o app publicado) são entidades separadas. Quando você faz uma atualização no código, o GitHub gera o arquivo do app, mas a Google não "puxa" isso sozinha. Você precisa **entregar** esse arquivo para ela.

Aqui está exatamente como funciona o ciclo de vida de uma atualização:

---

### 1. O que precisa de atualização na Loja vs. O que é automático

Primeiro, é importante distinguir o tipo de mudança:

* **Alterações no Backend (Node.js/API):**
* Se você mudar uma lógica no servidor, corrigir um bug na API ou mudar o banco de dados.
* **Ação:** Apenas dê o deploy no seu servidor (Docker).
* **Resultado:** Todos os usuários recebem a mudança **instantaneamente**, sem precisar baixar nada novo na Play Store.


* **Alterações no Frontend (React/Layout/Telas):**
* Como o Capacitor "embutiu" o seu site dentro do celular (para ele funcionar offline e rápido), o código antigo mora dentro do aparelho do usuário.
* **Ação:** Você precisa gerar uma nova versão do App e subir na Play Store.
* **Resultado:** O celular do usuário vai avisar "Atualização disponível" e baixará a nova versão.



---

### 2. O Passo a Passo da Atualização (Manual)

Este é o método mais comum e seguro. Você usa o GitHub para gerar o arquivo, baixa ele e sobe manualmente no Google Play Console.

**Passo 1: Aumentar a Versão (CRUCIAL)**
A Google recusa qualquer arquivo que tenha o mesmo número de versão do anterior.

1. No arquivo `client/package.json`: Mude `"version": "1.0.0"` para `"1.0.1"`.
2. No arquivo `client/android/app/build.gradle`:
* Mude `versionCode 1` para `versionCode 2` (sempre número inteiro +1).
* Mude `versionName "1.0"` para `"1.0.1"`.



**Passo 2: Gerar o "Release Bundle" (AAB)**
Atualmente, estamos gerando um **APK de Debug** (para testes). A Play Store **não aceita APK**, e **não aceita Debug**. Ela exige um formato chamado **AAB (Android App Bundle)** assinado com uma chave criptografada.

* *Futuro:* Precisaremos criar um novo arquivo `.yml` no GitHub chamado `android-release.yml` que usa uma Chave de Assinatura (Keystore) para gerar esse arquivo final.

**Passo 3: Upload na Google Play Console**

1. Você entra em `play.google.com/console`.
2. Vai em "Produção" > "Criar nova versão".
3. Sobe o arquivo `.aab` que o GitHub gerou.
4. Escreve as notas da versão ("Correção de bugs", "Nova tela de chat").
5. Envia para revisão.

---

### 3. É possível automatizar tudo (CI/CD)?

**Sim!** É possível configurar o GitHub Actions para, assim que você der o `git push`, ele:

1. Testar o código.
2. Gerar o AAB assinado.
3. **Enviar automaticamente para a Google Play Store** usando a API de Desenvolvedor do Google.

**Porém, a complexidade é Alta.**
Isso exige:

1. Criar uma conta de serviço na Google Cloud Platform.
2. Gerar chaves JSON de permissão.
3. Configurar essas chaves nos segredos do GitHub.
4. Configurar o fluxo de lançamento (Alpha, Beta, Produção).

### Minha Recomendação para o seu Momento

Como você acabou de finalizar a primeira versão "perfeita":

1. **Foque na Publicação Inicial (Manual):** Gere o AAB assinado manualmente (ou via GitHub Actions configurado para Release) e faça o primeiro upload manual. Isso ensina como a loja funciona.
2. **Mantenha o Backend Forte:** Lembre-se que qualquer melhoria no servidor (inteligência do PIF, regras de negócio) reflete no app sem precisar de atualização na loja. Use isso a seu favor.
3. **Automatize depois:** Só configure o envio automático (CD) quando você estiver fazendo atualizações semanais no frontend. Para atualizações mensais, o processo manual é mais seguro e permite que você revise antes de soltar.

**Você quer que eu configure agora o arquivo `android-release.yml` para gerar o arquivo AAB (App Bundle) pronto para a loja?** (Para isso, você precisará gerar uma Keystore no seu computador e me passar algumas informações, mas sem me dar a senha real).