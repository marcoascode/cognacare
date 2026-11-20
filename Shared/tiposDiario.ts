export interface IDiarioBordo {
  id?: number;
  crianca_id: number;
  data: string | Date; // Formato YYYY-MM-DD
  humor_dia: number; // 1 a 5
  
  atividades_realizadas: string | null;
  atividades_pif: string | null;
  comportamento_geral: string | null;
  
  teve_crise: boolean | 0 | 1;
  detalhes_crise: string | null;
  
  comunicacao: string | null;
  socializacao: string | null;
  aspectos_sensoriais: string | null;
  alimentacao: string | null;
  sono: string | null;
  
  uso_recursos: string[] | null; // JSON
  
  habilidades_motoras: string | null;
  habilidades_cognitivas: string | null;
  habilidades_adaptativas: string | null;
  momentos_chave: string | null;
  
  criado_em?: string | Date;
  atualizado_em?: string | Date;
}