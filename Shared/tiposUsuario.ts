export interface IUsuario {
  id?: number;
  nome: string;
  email: string;
  documento_nacional: string | null;
  telefone: string | null;
  cep: string | null;
  endereco_logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  cidade: string | null;
  estado_uf: string | null;
  pais: string;
  senha?: string; // Opcional para nunca vazarmos a senha no frontend acidentalmente
  criado_em?: string | Date;
  
  // Saldos e Assinatura
  creditos: number;
  saldo_bonus: string | number; // Decimal no MySQL pode vir como string para não perder precisão
  slots: number;
  status: 'admin' | 'user';
  status_assinatura: 'ativo' | 'inativo' | 'cancelado' | 'reembolsado';
  tipo_plano: 'avulso' | 'assinatura' | 'mensal' | 'semestral' | 'anual' | 'anual_founder';
  assinatura_expira_em: string | Date | null;
  chat_mensagens_restantes: number;
  vencimento_assinatura: string | Date | null;
  efi_subscription_id: number | null;
  plano_ativo: 'free' | 'mensal' | 'semestral' | 'anual_founder';

  // Flags Booleanas (MySQL TINYINT)
  email_verified: boolean | 0 | 1;
  is_founder: boolean | 0 | 1;
  is_agent_active: boolean | 0 | 1;
  is_affiliate: boolean | 0 | 1;
  perfil_recompensado: boolean | 0 | 1;

  foto_perfil: string | null;
  chave_pix: string | null;
  tipo_chave_pix: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria' | null;
}