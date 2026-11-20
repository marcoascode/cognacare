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
  TextField,
} from '@mui/material';
import api from '../../api/axiosConfig';

// --- INTERFACES ---
interface IUsuario {
  id: number;
  nome: string;
  email: string;
  creditos: number;
}

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<IUsuario[]>([]);
  const [filteredUsuarios, setFilteredUsuarios] = useState<IUsuario[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const response = await api.get('/fernandasepe/admin/usuarios');
      const data: IUsuario[] = response.data;
      setUsuarios(data);
      setFilteredUsuarios(data);
    } catch (error: any) {
      console.error('Erro ao buscar usuários:', error);
      alert(error.response?.data?.erro || 'Erro ao buscar usuários. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  useEffect(() => {
    setFilteredUsuarios(
      usuarios.filter((user) =>
        user.nome.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [search, usuarios]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" fontWeight="bold" color="primary" gutterBottom>
        Usuários Cadastrados
      </Typography>
      
      <TextField
        label="Filtrar por Nome"
        value={search}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
        fullWidth
        margin="normal"
        variant="outlined"
        size="small"
        sx={{ mb: 3 }}
      />
      
      <TableContainer component={Paper} elevation={3}>
        <Box
          sx={{
            maxHeight: '60vh', // Altura máxima para ativar o scroll
            overflowY: 'auto',
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ backgroundColor: '#1976d2', color: 'white', fontWeight: 'bold' }}>
                  Nome
                </TableCell>
                <TableCell sx={{ backgroundColor: '#1976d2', color: 'white', fontWeight: 'bold' }}>
                  E-mail
                </TableCell>
                <TableCell sx={{ backgroundColor: '#1976d2', color: 'white', fontWeight: 'bold' }} align="center">
                  Créditos de PIF
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">Nenhum usuário encontrado com esse nome.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsuarios.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>{user.nome}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight="bold" color="primary">
                        {user.creditos || 0}
                      </Typography>
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
}