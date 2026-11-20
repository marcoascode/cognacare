export interface ICrianca {
  id_crianca?: number;
  usuario_id?: number;
  nome: string;
  idade: string | Date; // No banco é do tipo DATE
  alfabetizado: string; // 'Sim' | 'Não'
  
  // O banco guarda como JSON, assumimos array de strings ao trafegar
  diagnostico: string[]; 
  hiperfoco: string | null;
  
  sexo: 'Masculino' | 'Feminino' | 'Prefiro não informar' | null;
  faz_terapia: 'Sim' | 'Não' | null;
  terapias: string | null;
  frequenta_escola: 'Sim' | 'Não' | null;
  ano_escolar: string | null;
  tipo_fala: string | null;
  
  com_quem_vive: string[] | null; // JSON
  cuidador_principal: string | null;
  tem_animal: 'Sim' | 'Não' | null;
  animal: string | null;
  interage_animal: 'Sim' | 'Não' | null;
  
  dificuldade_cuidador: string | null;
  prioridade_desenvolvimento: string | null;
  peso: number | string | null; // Decimal(5,2)
  altura: number | string | null; // Decimal(3,2)
  
  disturbio_alimentar: string | null;
  detalhes_disturbio: string | null;
  perfil_sensorial: string[] | null; // JSON
  estrategias_regulacao: string | null;
  gatilhos_comuns: string | null;
  info_adicional: string | null;
}