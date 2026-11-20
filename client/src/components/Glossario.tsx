import React, { useState, useMemo, useEffect } from 'react';
import {
    Grid,
    Typography,
    Box,
    Paper,
    TextField,
    InputAdornment,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip,
    CircularProgress
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useTranslation } from 'react-i18next';
import api from '../../src/api/axiosConfig'; // Certifique-se de que o caminho está correto para a sua estrutura

// --- INTERFACE PARA TIPAGEM DOS TERMOS ---
interface ITermoGlossario {
    termo: string;
    definicao: string;
    tags?: string[];
}

export default function Glossario() {
    const theme = useTheme();
    const { t, i18n } = useTranslation();
    const [searchTerm, setSearchTerm] = useState<string>('');

    // Estados para integração com a Base de Dados
    const [termsList, setTermsList] = useState<ITermoGlossario[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // Efeito para buscar os termos da base de dados ao carregar ou mudar idioma
    useEffect(() => {
        const fetchGlossario = async () => {
            setLoading(true);
            try {
                // Pega o prefixo do idioma atual (ex: 'pt-BR' vira 'pt', 'en-US' vira 'en')
                const idiomaAtual = i18n.language ? i18n.language.split('-')[0] : 'pt';
                const response = await api.get(`/fernandasepe/glossario?lng=${idiomaAtual}`);

                // Validação segura para garantir que as tags são sempre convertidas num array
                const parsedData: ITermoGlossario[] = response.data.map((item: any) => {
                    let parsedTags: string[] = [];
                    if (Array.isArray(item.tags)) {
                        parsedTags = item.tags;
                    } else if (typeof item.tags === 'string' && item.tags.trim() !== '') {
                        try {
                            parsedTags = JSON.parse(item.tags);
                        } catch (e) {
                            parsedTags = [];
                        }
                    }
                    return {
                        termo: item.termo,
                        definicao: item.definicao,
                        tags: parsedTags
                    };
                });

                setTermsList(parsedData);
            } catch (error) {
                console.error("Erro ao carregar o glossário da base de dados", error);
            } finally {
                setLoading(false);
            }
        };

        fetchGlossario();
    }, [i18n.language]);

    // Função para remover acentos e facilitar a busca (ex: "comunicação" == "comunicacao")
    const normalizeString = (str?: string): string => {
        if (!str) return "";
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };

    // Filtra os termos com base no que foi digitado
    const filteredTerms = useMemo(() => {
        if (!searchTerm) return termsList;

        const normalizedSearch = normalizeString(searchTerm);
        return termsList.filter(item =>
            normalizeString(item.termo).includes(normalizedSearch) ||
            normalizeString(item.definicao).includes(normalizedSearch) ||
            (item.tags && item.tags.some(tag => normalizeString(tag).includes(normalizedSearch)))
        );
    }, [searchTerm, termsList]);

    // Ordena os termos em ordem alfabética para facilitar a leitura
    const sortedAndFilteredTerms = [...filteredTerms].sort((a, b) => a.termo.localeCompare(b.termo));

    return (
        <Grid container justifyContent='center' alignItems='center' sx={{ px: 2, py: { xs: 2, md: 3 } }}>
            <Box sx={{ textAlign: 'center', mb: 5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 2 }}>
                    <MenuBookIcon color="primary" sx={{ fontSize: 40 }} />
                    <Typography variant="h3" component="h1" fontWeight="bold" color="primary">
                        {t('glossary.title') as string || 'Glossário Cognacare'}
                    </Typography>
                </Box>
                <Typography variant="h6" color="text.secondary">
                    {t('glossary.subtitle') as string || 'Traduza o "terapeutês" para o português. Entenda os termos técnicos do desenvolvimento infantil.'}
                </Typography>
            </Box>

            <Grid size={{ xs: 12, md: 8 }}>
                <Paper elevation={3} sx={{
                    p: { xs: 2, sm: 4 },
                    border: '1px solid',
                    borderColor: alpha(theme.palette.info.dark, 0.5),
                    borderRadius: 3,
                }}
                >

                    {/* Campo de Pesquisa */}
                    <TextField
                        fullWidth
                        variant="outlined"
                        placeholder={t('glossary.search_placeholder') as string || 'Buscar termo, sigla ou terapia...'}
                        value={searchTerm}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                        sx={{ mb: 4, bgcolor: alpha(theme.palette.text.primary, 0.05) }}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                ),
                            }
                        }}
                    />

                    {/* Exibição Condicional: A carregar, Lista de Termos ou Nenhum Resultado */}
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                            <CircularProgress color="primary" />
                        </Box>
                    ) : sortedAndFilteredTerms.length > 0 ? (
                        sortedAndFilteredTerms.map((item, index) => (
                            <Accordion key={index} sx={{ mb: 1, '&:before': { display: 'none' }, boxShadow: 1, border: '1px solid #777777', borderRadius: 1 }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: 1 }}>
                                    <Typography variant="subtitle1" fontWeight="bold" color="primary.dark">
                                        {item.termo}
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails sx={{ bgcolor: alpha(theme.palette.text.primary, 0.05) }}>
                                    <Typography variant="body1" color="text.secondary" paragraph sx={{ whiteSpace: 'pre-line' }}>
                                        {item.definicao}
                                    </Typography>
                                    {/* Renderiza as tags validadas pela API */}
                                    {item.tags && item.tags.length > 0 && (
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
                                            {item.tags.map((tag, idx) => (
                                                <Chip key={idx} label={tag} size="small" variant="outlined" color="primary" />
                                            ))}
                                        </Box>
                                    )}
                                </AccordionDetails>
                            </Accordion>
                        ))
                    ) : (
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                            <Typography variant="h6" color="text.secondary">
                                {t('glossary.no_results') as string || 'Nenhum termo encontrado com essa palavra.'}
                            </Typography>
                        </Box>
                    )}
                </Paper>
            </Grid>
        </Grid>
    );
}