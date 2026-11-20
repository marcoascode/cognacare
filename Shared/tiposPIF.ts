export interface IPlanoFamiliar {
  id_plano?: number;
  usuario_id: number;
  id_crianca: number;
  
  // Qualquer objeto JSON vindo do frontend com o formulário gigante
  dados_formulario: Record<string, any>; 
  
  resposta_ia: string | null; // O resultado final em Markdown gerado pelo Claude
  criado_em?: string | Date;
}