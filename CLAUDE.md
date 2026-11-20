# CLAUDE.md — Cognacare

> Contexto técnico, clínico, regulatório e arquitetural da plataforma **Cognacare**, destinado a orientar auditorias, refatorações estruturais e propostas de novas funcionalidades.

---

## 1. Visão Geral do Produto e Negócio

* **Produto:** **Cognacare**, plataforma de intervenção parental e apoio ao cuidado familiar de crianças e adolescentes neurodivergentes[cite: 1, 4].
* **Público do Estudo Piloto (PIPE Fase 1):** 40 famílias beta com crianças de 3 a 6 anos diagnosticadas com TEA Nível 1 ou 2 de suporte[cite: 4].
* **Empresa:** **Cognacare Tecnologia LTDA** (CNPJ `65.640.760/0001-09`), EdTech/HealthTech fundada em 2026 com sede em Águas de São Pedro/SP[cite: 4].
* **Sócios-Fundadores:** **Fernanda Cristina Silva Sepe** (neuropsicopedagoga, mestranda em Desenvolvimento Infantil e especialista em neurodivergência) e **Marco Aurelio Sepe** (especialista em arquitetura de sistemas e inteligência artificial)[cite: 4].
* **Propriedade Intelectual:**
  * Certificado de Registro de Programa de Computador no INPI nº **`BR 51 2026 002654-7`** (data de criação: 19/03/2026; proteção válida até 31/12/2076; titular: Cognacare Tecnologia LTDA; criador: Marco Aurelio Sepe)[cite: 6].
  * Pedido de registro da marca **"Cognacare"** no INPI nº **`943118905`**[cite: 4].
  * A lógica proprietária de decisão, ponderação de dados, regras de priorização e memória contextual (**`Approach 2`**) é protegida como **segredo industrial**[cite: 4].
* **Objetivo Estratégico (STRL 4 → STRL 6):** Evoluir a plataforma de uma ferramenta passiva de coleta estruturada, geração de planos e registro em diário de bordo (**STRL 4**) para um **Copiloto de Cuidado Familiar** proativo e orientado por objetivo — o **Cognacare Agent** (**STRL 6**), validado em ambiente real[cite: 4].
* **Frentes de Atuação:** Suporte direto a famílias atípicas (B2C) e expansão para clínicas multidisciplinares de neurodivergência (Psicologia/ABA, Terapia Ocupacional e Fonoaudiologia) por meio de parcerias e licenciamento (B2B)[cite: 4, 8].

---

## 2. Domínio Clínico, Ético e Guardrails (REGRAS INVIOLÁVEIS)

Toda refatoração de código, revisão de prompt ou sugestão de nova funcionalidade deve respeitar estritamente os seguintes limites:

* **Intervenção Familiar ≠ Intervenção Clínica:** O Cognacare apoia exclusivamente a **intervenção familiar** (estratégias e adaptações conduzidas pelos cuidadores no ambiente doméstico) e **nunca** substitui ou invade a **intervenção clínica** (exclusiva de profissionais licenciados)[cite: 4].
* **Proibição de Decisões Médicas/Clínicas:** O agente **não** realiza diagnósticos, não prescreve condutas médicas e não altera tratamentos clínicos[cite: 4]. Todos os fluxos de IA devem operar sob *guardrails* explícitos definidos e auditados por uma **Equipe Clínica Multidisciplinar Independente** (Psicologia, Fonoaudiologia, Terapia Ocupacional e Fisioterapia/Motricidade), seguindo as diretrizes de Ética em IA na Saúde da OMS (WHO, 2021)[cite: 4].
* **Embasamento Científico (PBE):** As recomendações geradas pela plataforma devem ser ancoradas em Práticas Baseadas em Evidências, como **Intervenções Comportamentais Desenvolvimentais Naturalistas (NDBI)** e princípios da **Ciência ABA** aplicados ao ambiente natural[cite: 4].
* **Rigor Científico (PIPE Fase 1):** A coleta de telemetria e dados de adesão deve suportar a avaliação pelo **Framework RE-AIM** (*Reach, Effectiveness, Adoption, Implementation, Maintenance*) e a calibração do *checklist* avaliativo do Cognacare frente a 7 protocolos clínicos validados (**AVD, CIF, CDC, ChIPPA, PROC, ABFW e M-ABC Test**)[cite: 4].
* **Experiência do Cuidador:** Fluxos, interface e textos da IA devem minimizar a sobrecarga cognitiva, emocional e operacional, combatendo a paralisia de decisão dos pais no cotidiano[cite: 4].

---

## 3. Stack Tecnológica e Arquitetura Atual

* **Linguagens Registradas na Base Atual:** CSS, HTML, Java, JavaScript, JSON, MySQL e Node.js[cite: 6].
* **Backend:** Node.js, com diretriz de evolução para código limpo, modular e tipado em **TypeScript**[cite: 1, 2].
* **Frontend Web:** **React.js** seguindo o padrão visual de design do **Elementor / Tailwind CSS**[cite: 1].
* **Mobile (Android):** Aplicativo publicado na Google Play Store em formato **App Bundle (`.aab`)**[cite: 9]. Deve utilizar ofuscação R8/ProGuard (`minifyEnabled true`, com exceções adequadas em `proguard-rules.pro` para bibliotecas que usam Reflection/JSON) e gerar/enviar o arquivo de desofuscação (`mapping.txt`) para depuração de crashes e ANRs na Play Console[cite: 9].
* **Banco de Dados Relacional:** **MySQL**, armazenando dados estruturados das crianças, planos de intervenção, diário de bordo, gestão/faturamento e a tabela de prompts e configurações dos agentes[cite: 2, 5, 8].
* **Memória Vetorial & RAG:** **Pinecone** combinado com **OpenAI Embeddings**[cite: 2, 4]. O serviço `server/services/memoryService.js` lê textos do MySQL, converte em embeddings via OpenAI e envia os vetores ao Pinecone[cite: 2].
* **Motor Multi-LLM (Configurado em Banco):** Os agentes utilizam prompts, temperaturas, `max_tokens` e modelos definidos dinamicamente no MySQL — atualmente **Anthropic Claude** (`claude-sonnet-4-6`, `claude-3-5-sonnet-20241022`) e **Grok** (`grok-4.3`) — com variáveis de template `{{...}}` e saídas estruturadas em JSON estrito ou Markdown[cite: 2, 5].
* **Infraestrutura:** Microsserviços em containers **Docker** atrás de proxy reverso **Nginx** em servidor **Hetzner**[cite: 1, 3, 8].

---

## 4. Funcionalidades Atuais e Núcleo Agentic (`Approach 2`)

O diferencial técnico central da plataforma é o **`Approach 2`**: uma lógica de decisão proprietária (inspirada em arquiteturas *agentic* como **ReAct** combinadas a RAG e memória de longo prazo) que cruza o **"agora"** (sinais dinâmicos do Diário de Bordo, humor, crises, sono, agenda terapêutica e medicações) contra o **"sempre"** (Plano de Intervenção Familiar e histórico longitudinal vetorizado) para gerar orientações proativas[cite: 4, 5].

### 4.1 Módulos Principais Existentes

1. **Coleta Estruturada e Checklist Avaliativo:** Mapeamento do perfil funcional e sensorial da criança[cite: 4, 5].
2. **Motor de Planos de Intervenção Familiar (PIF):** Geração estruturada em etapas via LLM (ex.: Etapa 5 utilizando `claude-sonnet-4-6`, `max_tokens: 8000`, gerando *7. Manejo de comportamentos desafiadores*, *8. Monitoramento e registro* e *9. Recomendações finais*)[cite: 4, 5].
3. **Diário de Bordo / Diário Evolutivo:** Registro longitudinal de marcos de desenvolvimento, frequência de crises, tempo de atenção focal, gatilhos de desregulação, sono, alimentação, agenda de terapias e medicações[cite: 4, 5].
4. **Pipeline de Memória Contextual (`server/services/memoryService.js`):** Extração de textos do MySQL, geração de embeddings na OpenAI e indexação no Pinecone[cite: 2, 4].
5. **Agentes Especializados Ativos (cadastrados no MySQL):**[cite: 5]
   * `agent_user_cancelamento` (`claude-sonnet-4-6`, `max_tokens: 400`): foca no bem-estar emocional do cuidador após cancelamento de terapia, retornando JSON (`nivel_estresse`, `tom_emocional`, `mensagem_apoio`)[cite: 5].
   * `agent_relatorio_pedagogico` (`claude-3-5-sonnet-20241022`, temp `0.50`, `max_tokens: 1200`): persona educador especializado / BCBA-D que gera síntese comportamental (100–150 palavras) e top 3 sugestões práticas para casa *(nota de auditoria: verificar e corrigir eventual espaço acidental na chave `"sugestoes_casa_ top_3"` no prompt em banco)*[cite: 5].
   * `agent_reposicao_terapia` (`claude-3-5-sonnet-20241022`, temp `0.50`, `max_tokens: 500`): consultor BCBA-D empático que recebe `{{nome_crianca}}`, `{{terapia_cancelada}}`, `{{motivo_cancelamento}}`, `{{perfil_sensorial}}` e `{{humor_hoje}}`, retornando JSON estrito (`mensagem_acolhimento`, `sugestao_atividade`)[cite: 5].
   * `agent_historia_social`: gera História Social e rotina visual passo a passo a partir de `{{nome_crianca}}`, `{{evento_gatilho}}` e `{{perfil_sensorial}}` para reduzir ansiedade antecipatória[cite: 5].
   * **Agente de Receitas/Medicamentos** (`grok-4.3`, temp `0.10`, `max_tokens: 800`): extrai `instrucoes` de uso e resume possíveis `efeitos_colaterais` embasados na ciência em JSON estruturado[cite: 5].
   * `agent_detetive_padroes` (*Cognacare Pattern Detective*): realiza mineração de padrões em janelas de 15–30 dias cruzando `{{dados_sono_crises}}`, `{{dados_agenda}}` e `{{dados_medicamentos}}` para detectar correlações comportamentais ocultas[cite: 5].
6. **Frente B2B / Gestão Clínica (Arquitetura de Expansão):** Aplicação assíncrona do `Approach 2` para predição de churn/evasão de pacientes (queda de frequência em terapias ou engajamento parental) e alertas preventivos sobre gargalos de autorização de guias junto a planos de saúde[cite: 8].

---

## 5. Segurança, Privacidade e Conformidade (LGPD / GDPR)

Os registros de neurodesenvolvimento, saúde mental infantil e faturamento são **dados sensíveis** protegidos por LGPD e GDPR[cite: 1, 8]. A refatoração deve aplicar estritamente:

* **Isolamento Estrutural entre Tiers:** Manter separação lógica absoluta entre diferentes níveis de serviço (ex.: usuários da camada **Essential** vs. camadas avançadas de **Agentes**), garantindo que consultas no MySQL, tabelas de faturamento e vetores no Pinecone (via namespaces/filtros obrigatórios por tenant/criança) jamais permitam acesso transversal[cite: 8].
* **Anonimização / Pseudonimização de PII:** Antes de enviar contexto para APIs externas (OpenAI, Pinecone, Anthropic, Grok) ou gerar relatórios macro, remover ou pseudonimizar identificadores pessoais diretos para preservar o anonimato de crianças e famílias[cite: 2, 5, 8].
* **Blindagem de Borda e Banco:** Utilizar o proxy reverso Nginx para interceptar e sanitizar requisições na borda, manter o MySQL inacessível externamente e validar todas as entradas contra SQL Injection e XSS[cite: 8].
* **Gestão Segura de Segredos:** Armazenar todas as credenciais (MySQL, OpenAI, Anthropic, Pinecone, Grok e integrações externas como Google Drive API via *Service Account*) exclusivamente em variáveis de ambiente injetadas nos containers Docker — nunca no código-fonte ou em logs[cite: 1, 2].

---

## 6. Infraestrutura, Performance e Regra Crítica no Servidor Hetzner

* **REGRA CRÍTICA DE COEXISTÊNCIA EM PRODUÇÃO:** O servidor Hetzner hospeda **outras aplicações independentes em Docker** que também utilizam MySQL (como o painel **ChatPluto**)[cite: 3].
  * **NUNCA** executar nem sugerir comandos destrutivos globais (como `docker builder prune -a -f`, `docker image prune -a -f`, `docker system prune -a` ou derrubada de containers/redes compartilhadas) que possam afetar o banco ou os serviços do ChatPluto[cite: 3].
  * Todo serviço do Cognacare deve rodar de forma estanque em rede Docker isolada, com nomes de containers, volumes e portas dedicados (prefixo `cognacare_*`)[cite: 3, 8].
  * Sempre validar a configuração do proxy reverso com `nginx -t` antes de executar `nginx -s reload`[cite: 3].
* **Eficiência de Recursos (Docker / Nginx):**
  * Minimizar o consumo de RAM e CPU nos containers Node.js, React e Nginx (builds multi-stage, imagens enxutas e limites de memória no `docker-compose.yml`)[cite: 1, 8].
  * Executar rotinas pesadas (geração de embeddings, sincronização vetorial, jobs do `Approach 2` e *Pattern Detective*) de forma assíncrona e em lotes para evitar gargalos de I/O[cite: 2, 5, 8].

---

## 7. Padrões de Engenharia de Software para Refatoração

* **Arquitetura Limpa e Modular:** Separar responsabilidades em camadas (controllers/routes, use cases/services, repositories MySQL/Pinecone, adapters de LLM e validadores de schema)[cite: 1, 2].
* **TypeScript e Validação Estrita de Contratos:** Migrar/padronizar o backend para TypeScript rigoroso e validar requisições HTTP, variáveis de ambiente e **todas as respostas JSON dos agentes de IA** (ex.: via Zod), com tratamento explícito de falhas de parsing e fallback seguro[cite: 1, 5].
* **Adapter Multi-LLM e Gestão de Prompts:** Desacoplar chamadas a Anthropic, OpenAI e Grok atrás de uma interface única, validando todos os placeholders `{{...}}` antes do envio e registrando telemetria sem PII (modelo, tokens, latência e erros de contrato)[cite: 2, 5].
* **Frontend Padronizado:** Manter componentes React modulares, acessíveis e alinhados ao padrão visual Elementor/Tailwind[cite: 1].
* **Testabilidade:** Estruturar serviços críticos (isolamento de tier/namespace, pseudonimização, parsers dos agentes e regras do `Approach 2`) com injeção de dependências para permitir testes unitários automatizados.

---

## 8. Protocolo Obrigatório de Trabalho para o Claude

1. **Auditar antes de alterar:** Inspecione toda a estrutura real do repositório (`package.json`, rotas, services, schemas MySQL, prompts, `docker-compose*` e configs Nginx) antes de editar qualquer arquivo.
2. **Preservar compatibilidade em produção:** Não altere schemas de banco existentes sem fornecer scripts de migração seguros e reversíveis.
3. **Plano antes da implementação:** Para mudanças estruturais, apresente diagnóstico, trade-offs (LGPD, custo de tokens, consumo de RAM/CPU na Hetzner) e um plano incremental de sprints para aprovação prévia.
4. **Proatividade estruturada:** Ao sugerir melhorias ou novas funcionalidades, classifique-as em **Quick Wins**, **Refatoração Estrutural** e **Novas Funcionalidades (Roadmap STRL 6 / B2C / B2B)**, indicando impacto técnico, custo de IA e cuidados clínicos/LGPD.

---

## 9. Estrutura e Comandos Locais *(Preencher / Validar no 1º Scan)*

```text
- Backend:                 [ex: ./server]
- Frontend:                [ex: ./client]
- Mobile (se no repo):     [ex: ./mobile]
- Dev local:               [ex: npm run dev]
- Build / Lint / Testes:   [ex: npm run build | npm run lint | npm test]
- Docker Compose Prod:     [ex: docker-compose.prod.yml]
- Variáveis Críticas:      MYSQL_*, OPENAI_API_KEY, ANTHROPIC_API_KEY, PINECONE_API_KEY, GROK_API_KEY
```