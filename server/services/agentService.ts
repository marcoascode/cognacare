// --- MySQL ORIGINAL ---
// import poolPromise from '../config/mysqlPoolPromise';

// --- POSTGRESQL CORRIGIDO ---
import poolPromise from '../config/pgPoolPromise';
import { anthropic } from '../config/aiModels';

// Importações dos serviços de PDF (Assegure-se que estes ficheiros existem na pasta services)
import pdfService from './pdfService';
// CORREÇÃO: O serviço abaixo era invocado no JS original mas não estava importado!
import pdfHistoriasService from './pdfHistoriasService'; 

// =========================================================================
// INTERFACES E DECLARAÇÕES GLOBAIS
// =========================================================================

declare global {
    var io: any; // Garante que o TypeScript reconhece o global.io instanciado no index.ts
}

interface IPromptConfig {
    model: string;
    temperature: number;
    max_tokens: number;
}

interface IPromptResponse {
    texto: string;
    config: IPromptConfig;
}

interface IResultadoVisao {
    sucesso: boolean;
    mensagem_erro?: string;
    medicamento?: any;
}

const agentService = {
    /**
     * Função auxiliar para buscar e processar prompts da base de dados
     */
    async getProcessedPrompt(chave: string, variaveis: Record<string, any>): Promise<IPromptResponse> {
        const { rows } = await poolPromise.query(
            'SELECT texto_prompt, modelo, temperatura, max_tokens FROM fs_prompts WHERE chave = $1',
            [chave]
        );

        if (rows.length === 0) throw new Error(`Prompt com a chave "${chave}" não encontrado.`);

        let promptFinal = rows[0].texto_prompt;
        
        // Substitui cada {{chave}} pelo valor correspondente no objeto variaveis
        Object.keys(variaveis).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            promptFinal = promptFinal.replace(regex, variaveis[key] || 'Não informado');
        });

        return {
            texto: promptFinal,
            config: {
                model: rows[0].modelo,
                temperature: parseFloat(rows[0].temperatura),
                max_tokens: parseInt(rows[0].max_tokens)
            }
        };
    },

    /**
     * NÍVEL 1: GERAÇÃO DE RELATÓRIO PEDAGÓGICO
     * Compila dados brutos, invoca a IA (BCBA-D) e salva o rascunho JSON.
     */
    async compilarRelatorioPedagogico(
        criancaId: string | number, 
        usuarioIdGerador: string | number, 
        dataInicio: string, 
        dataFim: string, 
        tipoRelatorio: string = 'mensal'
    ) {
        console.log(`🧠 [Agente - Nível 1] Iniciando compilação de relatório para Criança ${criancaId} (${dataInicio} a ${dataFim})`);

        try {
            // 1. Coleta de Contexto (Criança e Perfil Sensorial JSON)
            const { rows: criancaData } = await poolPromise.query(
                'SELECT nome, perfil_sensorial FROM fs_crianca WHERE id_crianca = $1',
                [criancaId]
            );
            if (criancaData.length === 0) throw new Error('Criança não encontrada.');
            const crianca = criancaData[0];
            const perfilSensorialText = crianca.perfil_sensorial ? JSON.stringify(crianca.perfil_sensorial, null, 2) : 'Não informado';

            // 2. Coleta de Logs Brutos (Diário de Bordo) do período
            const { rows: diarios } = await poolPromise.query(`
                SELECT data, humor_dia, sono, alimentacao, teve_crise, detalhes_crise, comportamento_geral, atividades_pif
                FROM fs_diario_bordo
                WHERE crianca_id = $1 AND data BETWEEN $2 AND $3
                ORDER BY data ASC
            `, [criancaId, dataInicio, dataFim]);

            if (diarios.length === 0) {
                return { sucesso: false, erro: 'Dados insuficientes no Diário de Bordo para o período selecionado.' };
            }

            // 3. Formatação e Agregação de Dados para o Prompt
            let historicoDiarioText = '';
            let historicoPifText = '';

            diarios.forEach((d: any) => {
                const dataFormatada = new Date(d.data).toLocaleDateString('pt-BR');
                
                historicoDiarioText += `[Data: ${dataFormatada}]\n`;
                historicoDiarioText += `- Humor: ${d.humor_dia}/5 | Sono: ${d.sono || 'N/A'} | Alim.: ${d.alimentacao || 'N/A'}\n`;
                if (d.medicacao) historicoDiarioText += `- Medicação: ${d.medicacao}\n`;
                historicoDiarioText += `- Crise: ${d.teve_crise ? 'SIM (' + d.detalhes_crise + ')' : 'NÃO'}\n`;
                if (d.comportamento_geral) historicoDiarioText += `- Observações: ${d.comportamento_geral}\n`;
                historicoDiarioText += `------------------------\n`;

                if (d.atividades_pif) {
                    historicoPifText += `[Data: ${dataFormatada}]\n- Execução PIF: ${d.atividades_pif}\n`;
                }
            });

            // 4. Busca e Processamento do Prompt Dinâmico
            const promptDinamico = await this.getProcessedPrompt('agent_relatorio_pedagogico', {
                nome_crianca: crianca.nome,
                perfil_sensorial: perfilSensorialText,
                data_inicio: dataInicio,
                data_fim: dataFim,
                historico_diario: historicoDiarioText || 'Nenhum registro de comportamento.',
                historico_pif: historicoPifText || 'Nenhuma atividade do PIF registrada.'
            });

            // 5. Invocação da Persona Sênior (Claude BCBA-D)
            const response = await anthropic.messages.create({
                model: promptDinamico.config.model,
                max_tokens: promptDinamico.config.max_tokens,
                temperature: promptDinamico.config.temperature,
                system: "Você responde apenas em JSON estruturado de acordo com as especificações do prompt.",
                messages: [{ role: "user", content: promptDinamico.texto }]
            });

            let analiseIA: any;
            try {
                const responseText = (response.content[0] as any).text;
                analiseIA = JSON.parse(responseText);
            } catch (jsonError) {
                console.error('❌ Erro de Parse JSON na resposta da IA:', (response.content[0] as any).text);
                throw new Error('A IA não retornou um JSON válido.');
            }

            // 6. Salvamento do Rascunho no Banco de Dados
            const conteudoRelatorioJson = {
                contexto: { crianca: crianca.nome, inicio: dataInicio, fim: dataFim, tipo: tipoRelatorio },
                dados_brutos_compilados: { diario: historicoDiarioText, pif: historicoPifText },
                sintese_IA: analiseIA
            };

            const { rows: resultRows } = await poolPromise.query(`
                INSERT INTO fs_relatorios_gerados 
                (crianca_id, usuario_id_gerador, data_inicio, data_fim, tipo_relatorio, resumo_ia, conteudo_json, status) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'rascunho') RETURNING id
            `, [
                criancaId, 
                usuarioIdGerador, 
                dataInicio, 
                dataFim, 
                tipoRelatorio, 
                analiseIA.resumo_IA_acolhedor, 
                JSON.stringify(conteudoRelatorioJson)
            ]);

            const relatorioId = resultRows[0].id;
            console.log(`✅ [Agente - Nível 1] Rascunho de relatório gerado e salvo (ID: ${relatorioId})`);

            // 7. Geração do Artefato PDF Final
            console.log(`📄 [Agente] Gerando e-mail e PDF para o relatório ${relatorioId}...`);
            const urlPdf = await pdfService.gerarEEnviarRelatorio(conteudoRelatorioJson, relatorioId, usuarioIdGerador);

            // 8. Atualiza o banco com a URL do PDF
            await poolPromise.query(`
                UPDATE fs_relatorios_gerados 
                SET url_pdf = $1, status = 'finalizado' 
                WHERE id = $2
            `, [urlPdf, relatorioId]);

            console.log(`✅ [Agente - Nível 1] Processo concluído! PDF gerado e enviado por e-mail.`);

            return { 
                sucesso: true, 
                relatorioId: relatorioId, 
                url_pdf: urlPdf,
                data: analiseIA 
            };

        } catch (error) {
            console.error('❌ Erro na compilação do Relatório Pedagógico:', error);
            throw error; 
        }
    },

    /**
     * NÍVEL 2: AGENDA DINÂMICA
     * Avalia o cancelamento de uma terapia e gera uma atividade de reposição.
     */
    async avaliarCancelamentoAgenda(criancaId: string | number, agendaId: string | number, motivo: string) {
        console.log(`⏰ [Agente] Processando cancelamento da agenda ${agendaId} para a criança ${criancaId}`);

        try {
            const { rows: agendaData } = await poolPromise.query(`
                SELECT a.titulo, c.nome as categoria, u.id as usuario_id, cr.nome as crianca_nome, cr.perfil_sensorial
                FROM fs_agenda_crianca a
                JOIN fs_categorias_terapia c ON a.categoria_id = c.id
                JOIN fs_crianca cr ON a.crianca_id = cr.id_crianca
                JOIN fs_usuarios u ON cr.usuario_id = u.id
                WHERE a.id = $1
            `, [agendaId]);

            if (agendaData.length === 0) return;
            const info = agendaData[0];

            const { rows: diarioHoje } = await poolPromise.query(`
                SELECT humor_dia FROM fs_diario_bordo 
                WHERE crianca_id = $1 AND data = CURRENT_DATE
            `, [criancaId]);
            
            const humorHoje = diarioHoje.length > 0 ? `${diarioHoje[0].humor_dia}/5` : 'Não registrado ainda';
            const perfilDinamico = info.perfil_sensorial ? JSON.stringify(info.perfil_sensorial) : 'Sem restrições';

            const promptDinamico = await this.getProcessedPrompt('agent_reposicao_terapia', {
                nome_crianca: info.crianca_nome,
                terapia_cancelada: info.categoria || info.titulo,
                motivo_cancelamento: motivo || 'Não informado',
                perfil_sensorial: perfilDinamico,
                humor_hoje: humorHoje
            });

            const response = await anthropic.messages.create({
                model: promptDinamico.config.model,
                max_tokens: promptDinamico.config.max_tokens,
                temperature: promptDinamico.config.temperature,
                system: "Retorne apenas JSON válido.",
                messages: [{ role: "user", content: promptDinamico.texto }]
            });

            const ia = JSON.parse((response.content[0] as any).text);

            await poolPromise.query(`
                INSERT INTO fs_alertas_agente 
                (usuario_id, crianca_id, nivel_urgencia, risco_detectado, mensagem, sugestao_acao) 
                VALUES ($1, $2, 'baixo', $3, $4, $5)
            `, [
                info.usuario_id, 
                criancaId, 
                `Reposição de ${info.categoria || 'Terapia'}`, 
                ia.mensagem_acolhimento, 
                ia.sugestao_atividade
            ]);

            console.log(`✅ [Agente] Sugestão de reposição gerada com sucesso!`);

        } catch (error) {
            console.error('❌ Erro na avaliação de cancelamento de agenda:', error);
        }
    },

    /**
     * Avalia o impacto do cancelamento de uma terapia
     */
    async avaliarCancelamento(criancaId: string | number, agendaId: string | number, motivoCancelamento: string) {
        try {
            const { rows: agendaData } = await poolPromise.query(`
                SELECT a.titulo, a.anotacoes, c.nome as categoria_nome, cr.nome as nome_crianca, cr.usuario_id, cr.perfil_sensorial
                FROM fs_agenda_crianca a
                JOIN fs_categorias_terapia c ON a.categoria_id = c.id
                JOIN fs_crianca cr ON a.crianca_id = cr.id_crianca
                WHERE a.id = $1
            `, [agendaId]);

            if (agendaData.length === 0) return;
            const info = agendaData[0];

            const hoje = new Date().toLocaleDateString('en-CA');
            const { rows: diario } = await poolPromise.query(
                'SELECT humor_dia, teve_crise FROM fs_diario_bordo WHERE crianca_id = $1 AND data = $2',
                [criancaId, hoje]
            );

            const humorAtual = diario.length > 0 ? diario[0].humor_dia : 'Não relatado';
            const diretriz = (diario.length > 0 && diario[0].teve_crise)
                ? "Focar em acolhimento e regulação sensorial. Sem atividades exigentes."
                : "Sugerir brincadeira prática de 10 min para substituir o estímulo perdido.";

            const promptDinamico = await this.getProcessedPrompt('agent_user_cancelamento', {
                nome_crianca: info.nome_crianca,
                categoria_nome: info.categoria_nome,
                titulo: info.titulo,
                motivoCancelamento: motivoCancelamento,
                anotacoes: info.anotacoes,
                humorAtual: humorAtual,
                perfil_sensorial: info.perfil_sensorial,
                diretrizExtra: diretriz
            });

            const response = await anthropic.messages.create({
                model: promptDinamico.config.model,
                max_tokens: promptDinamico.config.max_tokens,
                temperature: promptDinamico.config.temperature,
                system: "Você responde apenas em JSON estruturado.",
                messages: [{ role: "user", content: promptDinamico.texto }]
            });

            const agenteJson = JSON.parse((response.content[0] as any).text);
            
            await poolPromise.query(
                'INSERT INTO fs_alertas_agente (crianca_id, usuario_id, alerta_payload) VALUES ($1, $2, $3)',
                [criancaId, info.usuario_id, JSON.stringify(agenteJson)]
            );

            if (global.io) {
                global.io.to(`user_${info.usuario_id}`).emit('alerta_agente', {
                    criancaId,
                    nome_crianca: info.nome_crianca,
                    alerta: agenteJson
                });
            }
        } catch (error) {
            console.error('Erro no processamento do Agente:', error);
        }
    },

    /**
     * NÍVEL 3: GERADOR DE HISTÓRIAS SOCIAIS (ROTINAS VISUAIS)
     */
    async gerarHistoriaSocial(criancaId: string | number, usuarioIdGerador: string | number, eventoGatilho: string) {
        console.log(`📚 [Agente - Nível 3] A criar História Social: "${eventoGatilho}" para a criança ${criancaId}...`);

        try {
            const { rows: criancaData } = await poolPromise.query(
                'SELECT nome, perfil_sensorial FROM fs_crianca WHERE id_crianca = $1',
                [criancaId]
            );
            
            if (criancaData.length === 0) throw new Error('Criança não encontrada.');
            
            const crianca = criancaData[0];
            const perfilSensorialText = crianca.perfil_sensorial ? JSON.stringify(crianca.perfil_sensorial) : 'Sem restrições sensoriais registadas.';

            const promptDinamico = await this.getProcessedPrompt('agent_historia_social', {
                nome_crianca: crianca.nome,
                evento_gatilho: eventoGatilho,
                perfil_sensorial: perfilSensorialText
            });

            const response = await anthropic.messages.create({
                model: promptDinamico.config.model,
                max_tokens: promptDinamico.config.max_tokens,
                temperature: promptDinamico.config.temperature,
                system: "Responda APENAS com um objeto JSON válido, contendo o título, passos com ordem/texto/emoji e a mensagem final.",
                messages: [{ role: "user", content: promptDinamico.texto }]
            });

            let historiaIA: any;
            try {
                historiaIA = JSON.parse((response.content[0] as any).text);
            } catch (jsonError) {
                console.error('❌ Erro de Parse JSON na resposta da IA:', (response.content[0] as any).text);
                throw new Error('A IA não devolveu um JSON válido para a história social.');
            }

            historiaIA.nome_crianca = crianca.nome;

            const { rows: resultRows } = await poolPromise.query(`
                INSERT INTO fs_historias_sociais 
                (crianca_id, usuario_id_gerador, evento_gatilho, conteudo_json, status) 
                VALUES ($1, $2, $3, $4, 'processando') RETURNING id
            `, [
                criancaId, 
                usuarioIdGerador, 
                eventoGatilho, 
                JSON.stringify(historiaIA)
            ]);

            const historiaId = resultRows[0].id;

            console.log(`📄 [Agente] A renderizar PDF visual para a história ${historiaId}...`);
            const urlPdf = await pdfHistoriasService.gerarHistoriaSocialPdf(historiaIA, historiaId);

            await poolPromise.query(`
                UPDATE fs_historias_sociais 
                SET url_pdf = $1, status = 'concluido' 
                WHERE id = $2
            `, [urlPdf, historiaId]);

            console.log(`✅ [Agente - Nível 3] História Social gerada com sucesso! Link: ${urlPdf}`);

            return { 
                sucesso: true, 
                historiaId: historiaId, 
                url_pdf: urlPdf,
                dados_historia: historiaIA 
            };

        } catch (error) {
            console.error('❌ Erro na geração da História Social:', error);
            throw error;
        }
    },

    /**
     * NÍVEL 4: DETETIVE DE PADRÕES (Data Mining Proativo)
     */
    async analisarPadroesEvolutivos(criancaId: string | number, dias: number = 7) {
        console.log(`🔍 [Detetive] Iniciando mineração de dados para a Criança ${criancaId} (Últimos ${dias} dias)`);
        
        try {
            const { rows: criancaData } = await poolPromise.query(
                'SELECT nome, perfil_sensorial, usuario_id FROM fs_crianca WHERE id_crianca = $1', 
                [criancaId]
            );
            if (criancaData.length === 0) return;
            const crianca = criancaData[0];

            const { rows: diarios } = await poolPromise.query(`
                SELECT data, humor_dia, sono, alimentacao, teve_crise, detalhes_crise, comportamento_geral 
                FROM fs_diario_bordo 
                WHERE crianca_id = $1 AND data >= CURRENT_DATE - CAST($2 AS INTEGER) * INTERVAL '1 day'
                ORDER BY data ASC
            `, [criancaId, dias]);

            if (diarios.length < 3) {
                console.log(`⏩ [Detetive] Dados insuficientes (${diarios.length} dias). Abortando análise para poupar tokens.`);
                return;
            }

            let historicoTexto = '';
            diarios.forEach((d: any) => {
                historicoTexto += `[Data: ${new Date(d.data).toLocaleDateString('pt-BR')}]\n`;
                historicoTexto += `- Humor: ${d.humor_dia}/5 | Sono: ${d.sono || 'N/A'} | Alim.: ${d.alimentacao || 'N/A'}\n`;
                historicoTexto += `- Crise: ${d.teve_crise ? 'SIM (' + d.detalhes_crise + ')' : 'NÃO'}\n`;
                if (d.comportamento_geral) historicoTexto += `- Notas: ${d.comportamento_geral}\n`;
                historicoTexto += `------------------------\n`;
            });

            const promptDinamico = await this.getProcessedPrompt('agent_job_padroes', {
                nome_crianca: crianca.nome,
                perfil_sensorial: crianca.perfil_sensorial,
                dias_analisados: dias,
                historico_dias: historicoTexto
            });

            const response = await anthropic.messages.create({
                model: promptDinamico.config.model,
                max_tokens: promptDinamico.config.max_tokens,
                temperature: promptDinamico.config.temperature,
                system: "Você responde apenas em JSON estruturado.",
                messages: [{ role: "user", content: promptDinamico.texto }]
            });

            const analise = JSON.parse((response.content[0] as any).text);

            if (analise.encontrou_padrao === true || analise.encontrou_padrao === "true") {
                await poolPromise.query(`
                    INSERT INTO fs_insights_agente 
                    (crianca_id, tipo_padrao, descricao_insight, precisao_confianca, data_analise, dias_analisados) 
                    VALUES ($1, $2, $3, $4, CURRENT_DATE, $5)
                `, [criancaId, analise.tipo_padrao, analise.descricao_insight, analise.precisao_confianca, dias]);

                console.log(`✅ [Detetive] Padrão "${analise.tipo_padrao}" salvo!`);

                if (global.io) {
                    global.io.to(`user_${crianca.usuario_id}`).emit('novo_insight_agente', {
                        criancaId,
                        titulo: "Novo Padrão Identificado 🔍",
                        mensagem: analise.descricao_insight
                    });
                }
            } else {
                console.log(`⏸️ [Detetive] Nenhum padrão forte o suficiente encontrado neste ciclo.`);
            }

        } catch (error) {
            console.error('❌ [Detetive] Falha ao analisar padrões:', error);
        }
    },

    async avaliarSobrecargaCuidador(usuarioId: string | number, textoRelato: string) {
        try {
            const promptDinamico = await this.getProcessedPrompt('agent_user_burnout', {
                relato_texto: textoRelato
            });

            const response = await anthropic.messages.create({
                model: promptDinamico.config.model,
                max_tokens: promptDinamico.config.max_tokens,
                temperature: promptDinamico.config.temperature,
                messages: [{ role: "user", content: promptDinamico.texto }]
            });

            const analise = JSON.parse((response.content[0] as any).text);

            await poolPromise.query(
                `INSERT INTO fs_estado_cuidador (usuario_id, nivel_estresse_inferido, tom_emocional_predominante, insight_apoio, data_avaliacao) 
                 VALUES ($1, $2, $3, $4, CURRENT_DATE)`,
                [usuarioId, analise.nivel_estresse, analise.tom_emocional, analise.mensagem_apoio]
            );

            if (['alto', 'critico'].includes(analise.nivel_estresse)) {
                if (global.io) {
                    global.io.to(`user_${usuarioId}`).emit('alerta_agente', {
                        titulo: "Uma pausa para você 🌸",
                        mensagem: analise.mensagem_apoio,
                        nivel_urgencia: 'medio'
                    });
                }
            }
        } catch (error) {
            console.error('Erro ao avaliar sobrecarga:', error);
        }
    },

    /**
     * NÍVEL 4: VISÃO COMPUTACIONAL E EXTRAÇÃO DE DOCUMENTOS
     */
    async extrairDadosReceita(fileBuffer: Buffer, mimeType: string): Promise<IResultadoVisao> {
        console.log(`👁️ [Agente - Nível 4] Iniciando leitura de receita médica (Vision API)...`);

        try {
            const promptDinamico = await this.getProcessedPrompt('agent_extracao_receita', {});
            const base64Image = fileBuffer.toString('base64');

            const response = await anthropic.messages.create({
                model: promptDinamico.config.model,
                max_tokens: promptDinamico.config.max_tokens,
                temperature: promptDinamico.config.temperature,
                system: "Retorne APENAS um objeto JSON estrito, sem formatação markdown fora do JSON.",
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "image",
                                source: {
                                    type: "base64",
                                    media_type: mimeType as any,
                                    data: base64Image
                                }
                            },
                            {
                                type: "text",
                                text: promptDinamico.texto
                            }
                        ]
                    }
                ]
            });

            let iaText = (response.content[0] as any).text;
            
            if (iaText.includes('```json')) {
                iaText = iaText.split('```json')[1].split('```')[0].trim();
            } else if (iaText.includes('```')) {
                 iaText = iaText.split('```')[1].split('```')[0].trim();
            }

            const analiseIA = JSON.parse(iaText);
            
            console.log(`✅ [Agente - Nível 4] Leitura concluída com sucesso!`);
            
            return {
                sucesso: true,
                medicamento: analiseIA
            };

        } catch (error) {
            console.error('❌ Erro na extração da receita médica:', error);
            throw new Error('Falha ao processar a imagem com a Inteligência Artificial.');
        }
    },

    /**
     * NÍVEL 4: DETETIVE DE PADRÕES
     */
    async rodarDetetiveDePadroes(criancaId: string | number) {
        console.log(`🕵️ [Agente - Nível 4] Iniciando Mineração de Padrões para a criança ${criancaId}...`);

        try {
            const { rows: criancaData } = await poolPromise.query('SELECT nome FROM fs_crianca WHERE id_crianca = $1', [criancaId]);
            if (criancaData.length === 0) return;

            const diasAnalise = 15;

            const { rows: diarios } = await poolPromise.query(`
                SELECT data, humor_dia, sono, teve_crise, detalhes_crise 
                FROM fs_diario_bordo 
                WHERE crianca_id = $1 AND data >= CURRENT_DATE - CAST($2 AS INTEGER) * INTERVAL '1 day'
                ORDER BY data ASC
            `, [criancaId, diasAnalise]);

            if (diarios.length < 5) {
                console.log(`⚠️ Dados insuficientes para análise de padrões (${diarios.length} dias).`);
                return;
            }

            const { rows: agenda } = await poolPromise.query(`
                SELECT data_hora_inicio, status, categoria_id 
                FROM fs_agenda_crianca 
                WHERE crianca_id = $1 AND data_hora_inicio >= CURRENT_DATE - CAST($2 AS INTEGER) * INTERVAL '1 day'
            `, [criancaId, diasAnalise]);

            const { rows: medicamentos } = await poolPromise.query(`
                SELECT nome_medicamento, data_inicio 
                FROM fs_medicamentos_crianca 
                WHERE crianca_id = $1 AND status = 'ativo'
            `, [criancaId]);

            const formatData = (date: Date | string) => new Date(date).toLocaleDateString('pt-BR');
            
            const stringDiario = diarios.map((d: any) => `[${formatData(d.data)}] Humor: ${d.humor_dia}/5 | Sono: ${d.sono || 'N/A'} | Crise: ${d.teve_crise ? 'Sim' : 'Não'}`).join('\n');
            const stringAgenda = agenda.map((a: any) => `[${formatData(a.data_hora_inicio)}] Terapia: ${a.status}`).join('\n') || 'Nenhuma terapia registrada.';
            const stringMeds = medicamentos.map((m: any) => `${m.nome_medicamento} (desde ${formatData(m.data_inicio)})`).join(', ') || 'Nenhum medicamento ativo.';

            const promptDinamico = await this.getProcessedPrompt('agent_detetive_padroes', {
                nome_crianca: criancaData[0].nome,
                dados_sono_crises: stringDiario,
                dados_agenda: stringAgenda,
                dados_medicamentos: stringMeds
            });

            const response = await anthropic.messages.create({
                model: promptDinamico.config.model,
                max_tokens: promptDinamico.config.max_tokens,
                temperature: promptDinamico.config.temperature,
                system: "Retorne estritamente um JSON de análise de padrões.",
                messages: [{ role: "user", content: promptDinamico.texto }]
            });

            const ia = JSON.parse((response.content[0] as any).text);

            if (ia.encontrou_padrao && ia.precisao_confianca !== 'baixa') {
                await poolPromise.query(`
                    INSERT INTO fs_insights_agente 
                    (crianca_id, tipo_padrao, descricao_insight, precisao_confianca, data_analise, dias_analisados) 
                    VALUES ($1, $2, $3, $4, CURRENT_DATE, $5)
                `, [
                    criancaId, 
                    ia.tipo_padrao, 
                    `${ia.descricao_insight} Dica: ${ia.sugestao_estrategica}`, 
                    ia.precisao_confianca,
                    diasAnalise
                ]);
                console.log(`✅ [Agente - Nível 4] Novo padrão descoberto e salvo!`);
            } else {
                console.log(`ℹ️ [Agente - Nível 4] Nenhum padrão forte detectado neste ciclo.`);
            }

        } catch (error) {
            console.error('❌ Erro na mineração de padrões:', error);
        }
    }
};

export default agentService;