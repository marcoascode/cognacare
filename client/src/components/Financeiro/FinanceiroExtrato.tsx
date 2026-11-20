import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';

import api from '../../api/axiosConfig';
import { useTranslation } from 'react-i18next';

// --- INTERFACES ---
export interface Transaction {
  transacao_id?: number | string;
  data: string | Date;
  descricao?: string;
  tipo: string;
  forma_pagamento?: string;
  valor?: string | number;
  valor_bonus?: string | number;
  creditos_pif?: number;
  creditos_chat?: number;
}

interface ExtratoResponse {
  extrato: Transaction[];
  saldo_pif: number | null;
  saldo_chat: number | null;
  saldo_bonus: string | number | null;
}

const Extrato: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();

  const [extrato, setExtrato] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saldoPif, setSaldoPif] = useState<number | null>(null);
  const [saldoChat, setSaldoChat] = useState<number | null>(null);
  const [saldoBonus, setSaldoBonus] = useState<string | number | null>(null);

  const getTipoDescricao = (item: Transaction): string => {
    if (item.tipo === 'B') return t('financial_statement.types.bonus');
    if (item.tipo === 'D' && item.descricao === t('financial_statement.types.credits_expired')) {
      return t('financial_statement.types.expiration');
    }

    const tipoLower = item.tipo?.toLowerCase();
    switch (tipoLower) {
      case 'c': return 'Compra';
      case 'd': return 'Consumo';
      default: return item.tipo;
    }
  };

  const fetchExtrato = async () => {
    try {
      const response = await api.get<ExtratoResponse>('/fernandasepe/extrato');
      const data = response.data;
      setExtrato(data.extrato);
      setSaldoPif(data.saldo_pif);
      setSaldoChat(data.saldo_chat);
      setSaldoBonus(data.saldo_bonus);
    } catch (error) {
      console.error('Error', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExtrato();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>
        {t('financial_statement.current_balances')}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Tooltip title={t('credittopif')} arrow>
          <Paper elevation={8} sx={{ p: 1, minWidth: 150, textAlign: 'center', border: '2px solid #1976d2' }}>
            <Typography variant="caption" color="text.secondary">
              {t('financial_statement.pif_credits')}
            </Typography>
            <Typography variant="h5" color="#1976d2">
              {saldoPif ?? '-'}
            </Typography>
          </Paper>
        </Tooltip>
        
        <Tooltip title={t('credittochat')} arrow>
          <Paper elevation={8} sx={{ p: 1, minWidth: 150, textAlign: 'center', border: '2px solid #4caf50' }}>
            <Typography variant="caption" color="text.secondary">
              {t('financial_statement.chat_messages')}
            </Typography>
            <Typography variant="h5" color="#4caf50">
              {saldoChat ?? '-'}
            </Typography>
          </Paper>
        </Tooltip>
        
        <Tooltip title={t('bonuscredit')} arrow>
          <Paper elevation={8} sx={{ p: 1, minWidth: 150, textAlign: 'center', border: '2px solid #9c27b0' }}>
            <Typography variant="caption" color="text.secondary">
              {t('financial_statement.bonus_balance')}
            </Typography>
            <Typography variant="h5" sx={{ color: '#9c27b0' }}>
              R$ {Number(saldoBonus || 0).toFixed(2)}
            </Typography>
          </Paper>
        </Tooltip>
      </Box>

      <Typography variant="h6" gutterBottom>
        {t('financial_statement.history')}
      </Typography>

      <TableContainer component={Paper} elevation={3}>
        <Box sx={{ maxHeight: { xs: '60vh', md: 'calc(100vh - 350px)' }, overflowY: 'auto' }}>
          <Table 
            stickyHeader 
            aria-label="Histórico" 
            size="small" 
            sx={{ border: '1px solid', borderColor: alpha(theme.palette.info.dark, 0.5), borderRadius: 3 }}
          >
            <TableHead>
              <TableRow sx={{ '& th': { backgroundColor: '#1976d2', color: '#ffffff', fontWeight: 'bold' } }}>
                <TableCell>{t('financial_statement.table.date')}</TableCell>
                <TableCell>{t('financial_statement.table.description')}</TableCell>
                <TableCell>{t('financial_statement.table.type')}</TableCell>
                <TableCell>{t('financial_statement.table.method')}</TableCell>
                <TableCell align="right">{t('financial_statement.table.paid_value')}</TableCell>
                <TableCell align="center">{t('financial_statement.table.bonus')}</TableCell>
                <TableCell align="center">{t('financial_statement.table.pif')}</TableCell>
                <TableCell align="center">{t('financial_statement.table.chat')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {extrato.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    {t('financial_statement.no_transactions')}
                  </TableCell>
                </TableRow>
              ) : (
                extrato.map((item, index) => (
                  <TableRow key={`${item.tipo}-${item.transacao_id || index}-${item.data}`} hover>
                    <TableCell>{new Date(item.data).toLocaleString('pt-BR')}</TableCell>
                    <TableCell>{item.descricao || '-'}</TableCell>
                    <TableCell>{getTipoDescricao(item)}</TableCell>
                    <TableCell>
                      {item.forma_pagamento === 'PIX'
                        ? 'PIX'
                        : (item.forma_pagamento === 'CARTAO' || item.forma_pagamento === 'CARTÃO' || item.forma_pagamento === t('financial_statement.methods.card').toUpperCase())
                          ? t('financial_statement.methods.card')
                          : item.forma_pagamento || '-'}
                    </TableCell>

                    {/* Valor Pago (Dinheiro Real) */}
                    <TableCell align="right">
                      {item.valor ? `R$ ${Number(item.valor).toFixed(2)}` : '-'}
                    </TableCell>

                    {/* Valor Bônus (Crédito/Débito de Bônus) */}
                    <TableCell align="center" sx={{ color: Number(item.valor_bonus) > 0 ? 'green' : Number(item.valor_bonus) < 0 ? 'orange' : 'inherit' }}>
                      {item.valor_bonus ? `R$ ${Number(item.valor_bonus).toFixed(2)}` : '-'}
                    </TableCell>

                    {/* Créditos PIF */}
                    <TableCell align="center" sx={{ color: (item.creditos_pif || 0) > 0 ? 'green' : (item.creditos_pif || 0) < 0 ? 'red' : 'inherit' }}>
                      {(item.creditos_pif || 0) > 0 ? `+${item.creditos_pif}` : item.creditos_pif !== 0 ? item.creditos_pif : '-'}
                    </TableCell>

                    {/* Créditos Chat */}
                    <TableCell align="center" sx={{ color: (item.creditos_chat || 0) > 0 ? 'success.main' : (item.creditos_chat || 0) < 0 ? 'red' : 'inherit' }}>
                      {(item.creditos_chat || 0) > 0 ? `+${item.creditos_chat}` : item.creditos_chat !== 0 ? item.creditos_chat : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      </TableContainer>
    </Box>
  );
};

export default Extrato;