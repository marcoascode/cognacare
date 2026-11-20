export const pifSteps = [
  'pif_steps.play',
  'pif_steps.language',
  'pif_steps.cognition',
  'pif_steps.social_emotional',
  'pif_steps.motor',
  'pif_steps.avd'
];

// Opções para o formulário "Fases do Brincar"
// Value: O que vai para o banco / Label: A chave de tradução para exibir na tela
export const fasesDoBrincarOptions = [
  { value: 'never', label: 'play_options.never' },
  { value: 'sometimes', label: 'play_options.sometimes' },
  { value: 'often', label: 'play_options.often' },
  { value: 'always', label: 'play_options.always' }
];

// Estrutura de dados detalhada usando chaves de tradução
export const fasesDoBrincarData = [
  {
    level: 'play_levels.exploratory',
    questions: [
      'play_questions.exploratory_1',
      'play_questions.exploratory_2',
      'play_questions.exploratory_3',
      'play_questions.exploratory_4',
      'play_questions.exploratory_5',
      'play_questions.exploratory_6',
      'play_questions.exploratory_7',
      'play_questions.exploratory_8',
      'play_questions.exploratory_9'
    ]
  },
  {
    level: 'play_levels.functional',
    questions: [
      'play_questions.functional_1',
      'play_questions.functional_2',
      'play_questions.functional_3',
      'play_questions.functional_4',
      'play_questions.functional_5',
      'play_questions.functional_6',
      'play_questions.functional_7',
      'play_questions.functional_8',
      'play_questions.functional_9',
      'play_questions.functional_10'
    ]
  },
  {
    level: 'play_levels.pre_symbolic',
    questions: [
      'play_questions.pre_symbolic_1',
      'play_questions.pre_symbolic_2',
      'play_questions.pre_symbolic_3',
      'play_questions.pre_symbolic_4',
      'play_questions.pre_symbolic_5',
      'play_questions.pre_symbolic_6',
      'play_questions.pre_symbolic_7',
      'play_questions.pre_symbolic_8',
      'play_questions.pre_symbolic_9'
    ]
  },
  {
    level: 'play_levels.symbolic',
    questions: [
      'play_questions.symbolic_1',
      'play_questions.symbolic_2',
      'play_questions.symbolic_3',
      'play_questions.symbolic_4',
      'play_questions.symbolic_5',
      'play_questions.symbolic_6',
      'play_questions.symbolic_7',
      'play_questions.symbolic_8',
      'play_questions.symbolic_9'
    ]
  },
  {
    level: 'play_levels.games_rules',
    questions: [
      'play_questions.games_rules_1',
      'play_questions.games_rules_2',
      'play_questions.games_rules_3',
      'play_questions.games_rules_4',
      'play_questions.games_rules_5',
      'play_questions.games_rules_6',
      'play_questions.games_rules_7',
      'play_questions.games_rules_8',
      'play_questions.games_rules_9',
      'play_questions.games_rules_10'
    ]
  }
];

export const desenvolvimentoLinguagemData = [
  { milestone: 'milestones.2m', abilities: ['language_abilities.2m_1', 'language_abilities.2m_2'] },
  { milestone: 'milestones.4m', abilities: ['language_abilities.4m_1', 'language_abilities.4m_2'] },
  { milestone: 'milestones.6m', abilities: ['language_abilities.6m_1'] },
  { milestone: 'milestones.9m', abilities: ['language_abilities.9m_1', 'language_abilities.9m_2', 'language_abilities.9m_3', 'language_abilities.9m_4'] },
  { milestone: 'milestones.12m', abilities: ['language_abilities.12m_1', 'language_abilities.12m_2', 'language_abilities.12m_3', 'language_abilities.12m_4'] },
  { milestone: 'milestones.18m', abilities: ['language_abilities.18m_1', 'language_abilities.18m_2', 'language_abilities.18m_3', 'language_abilities.18m_4', 'language_abilities.18m_5'] },
  { milestone: 'milestones.2y', abilities: ['language_abilities.2y_1', 'language_abilities.2y_2', 'language_abilities.2y_3', 'language_abilities.2y_4', 'language_abilities.2y_5', 'language_abilities.2y_6', 'language_abilities.2y_7'] },
  { milestone: 'milestones.30m', abilities: ['language_abilities.30m_1', 'language_abilities.30m_2', 'language_abilities.30m_3'] },
  { milestone: 'milestones.3y', abilities: ['language_abilities.3y_1', 'language_abilities.3y_2', 'language_abilities.3y_3', 'language_abilities.3y_4'] },
  { milestone: 'milestones.4y', abilities: ['language_abilities.4y_1', 'language_abilities.4y_2', 'language_abilities.4y_3', 'language_abilities.4y_4'] },
  { milestone: 'milestones.5y', abilities: ['language_abilities.5y_1', 'language_abilities.5y_2', 'language_abilities.5y_3', 'language_abilities.5y_4', 'language_abilities.5y_5'] },
  { milestone: 'milestones.6y', abilities: ['language_abilities.6y_1', 'language_abilities.6y_2', 'language_abilities.6y_3', 'language_abilities.6y_4'] }
];

export const desenvolvimentoCognicaoData = [
  { milestone: 'milestones.2m', abilities: ['cognition_abilities.2m_1', 'cognition_abilities.2m_2', 'cognition_abilities.2m_3', 'cognition_abilities.2m_4'] },
  { milestone: 'milestones.4m', abilities: ['cognition_abilities.4m_1', 'cognition_abilities.4m_2', 'cognition_abilities.4m_3', 'cognition_abilities.4m_4'] },
  { milestone: 'milestones.6m', abilities: ['cognition_abilities.6m_1', 'cognition_abilities.6m_2', 'cognition_abilities.6m_3'] },
  { milestone: 'milestones.9m', abilities: ['cognition_abilities.9m_1', 'cognition_abilities.9m_2', 'cognition_abilities.9m_3', 'cognition_abilities.9m_4'] },
  { milestone: 'milestones.12m', abilities: ['cognition_abilities.12m_1', 'cognition_abilities.12m_2'] },
  { milestone: 'milestones.18m', abilities: ['cognition_abilities.18m_1', 'cognition_abilities.18m_2', 'cognition_abilities.18m_3', 'cognition_abilities.18m_4'] },
  { milestone: 'milestones.2y', abilities: ['cognition_abilities.2y_1', 'cognition_abilities.2y_2'] },
  { milestone: 'milestones.30m', abilities: ['cognition_abilities.30m_1', 'cognition_abilities.30m_2', 'cognition_abilities.30m_3', 'cognition_abilities.30m_4', 'cognition_abilities.30m_5', 'cognition_abilities.30m_6'] },
  { milestone: 'milestones.3y', abilities: ['cognition_abilities.3y_1'] },
  { milestone: 'milestones.4y', abilities: ['cognition_abilities.4y_1', 'cognition_abilities.4y_2', 'cognition_abilities.4y_3', 'cognition_abilities.4y_4', 'cognition_abilities.4y_5', 'cognition_abilities.4y_6', 'cognition_abilities.4y_7', 'cognition_abilities.4y_8', 'cognition_abilities.4y_9', 'cognition_abilities.4y_10'] },
  { milestone: 'milestones.5y', abilities: ['cognition_abilities.5y_1', 'cognition_abilities.5y_2', 'cognition_abilities.5y_3', 'cognition_abilities.5y_4', 'cognition_abilities.5y_5', 'cognition_abilities.5y_6'] },
  { milestone: 'milestones.6y', abilities: ['cognition_abilities.6y_1', 'cognition_abilities.6y_2', 'cognition_abilities.6y_3', 'cognition_abilities.6y_4', 'cognition_abilities.6y_5', 'cognition_abilities.6y_6'] }
];

export const desenvolvimentoSocioemocionalData = [
  { milestone: 'milestones.2m', abilities: ['social_emotional_abilities.2m_1', 'social_emotional_abilities.2m_2'] },
  { milestone: 'milestones.4m', abilities: ['social_emotional_abilities.4m_1', 'social_emotional_abilities.4m_2', 'social_emotional_abilities.4m_3', 'social_emotional_abilities.4m_4'] },
  { milestone: 'milestones.6m', abilities: ['social_emotional_abilities.6m_1', 'social_emotional_abilities.6m_2', 'social_emotional_abilities.6m_3'] },
  { milestone: 'milestones.9m', abilities: ['social_emotional_abilities.9m_1', 'social_emotional_abilities.9m_2'] },
  { milestone: 'milestones.12m', abilities: ['social_emotional_abilities.12m_1', 'social_emotional_abilities.12m_2', 'social_emotional_abilities.12m_3'] },
  { milestone: 'milestones.18m', abilities: ['social_emotional_abilities.18m_1', 'social_emotional_abilities.18m_2', 'social_emotional_abilities.18m_3', 'social_emotional_abilities.18m_4'] },
  { milestone: 'milestones.2y', abilities: ['social_emotional_abilities.2y_1', 'social_emotional_abilities.2y_2', 'social_emotional_abilities.2y_3', 'social_emotional_abilities.2y_4', 'social_emotional_abilities.2y_5'] },
  { milestone: 'milestones.30m', abilities: ['social_emotional_abilities.30m_1', 'social_emotional_abilities.30m_2', 'social_emotional_abilities.30m_3', 'social_emotional_abilities.30m_4'] },
  { milestone: 'milestones.3y', abilities: ['social_emotional_abilities.3y_1', 'social_emotional_abilities.3y_2', 'social_emotional_abilities.3y_3'] },
  { milestone: 'milestones.4y', abilities: ['social_emotional_abilities.4y_1', 'social_emotional_abilities.4y_2', 'social_emotional_abilities.4y_3', 'social_emotional_abilities.4y_4'] },
  { milestone: 'milestones.5y', abilities: ['social_emotional_abilities.5y_1', 'social_emotional_abilities.5y_2', 'social_emotional_abilities.5y_3', 'social_emotional_abilities.5y_4'] },
  { milestone: 'milestones.6y', abilities: ['social_emotional_abilities.6y_1', 'social_emotional_abilities.6y_2', 'social_emotional_abilities.6y_3', 'social_emotional_abilities.6y_4'] }
];

export const desenvolvimentoMotricidadeData = [
  { milestone: 'milestones.2m', abilities: ['motor_abilities.2m_1'] },
  { milestone: 'milestones.4m', abilities: ['motor_abilities.4m_1', 'motor_abilities.4m_2', 'motor_abilities.4m_3'] },
  { milestone: 'milestones.6m', abilities: ['motor_abilities.6m_1', 'motor_abilities.6m_2', 'motor_abilities.6m_3', 'motor_abilities.6m_4'] },
  { milestone: 'milestones.9m', abilities: ['motor_abilities.9m_1', 'motor_abilities.9m_2', 'motor_abilities.9m_3'] },
  { milestone: 'milestones.12m', abilities: ['motor_abilities.12m_1', 'motor_abilities.12m_2', 'motor_abilities.12m_3', 'motor_abilities.12m_4', 'motor_abilities.12m_5', 'motor_abilities.12m_6'] },
  { milestone: 'milestones.18m', abilities: ['motor_abilities.18m_1', 'motor_abilities.18m_2', 'motor_abilities.18m_3', 'motor_abilities.18m_4', 'motor_abilities.18m_5', 'motor_abilities.18m_6', 'motor_abilities.18m_7', 'motor_abilities.18m_8'] },
  { milestone: 'milestones.2y', abilities: ['motor_abilities.2y_1', 'motor_abilities.2y_2', 'motor_abilities.2y_3', 'motor_abilities.2y_4', 'motor_abilities.2y_5', 'motor_abilities.2y_6', 'motor_abilities.2y_7'] },
  { milestone: 'milestones.30m', abilities: ['motor_abilities.30m_1', 'motor_abilities.30m_2', 'motor_abilities.30m_3', 'motor_abilities.30m_4', 'motor_abilities.30m_5', 'motor_abilities.30m_6'] },
  { milestone: 'milestones.3y', abilities: ['motor_abilities.3y_1', 'motor_abilities.3y_2', 'motor_abilities.3y_3', 'motor_abilities.3y_4', 'motor_abilities.3y_5'] },
  { milestone: 'milestones.4y', abilities: ['motor_abilities.4y_1'] },
  { milestone: 'milestones.5y', abilities: ['motor_abilities.5y_1', 'motor_abilities.5y_2'] },
  { milestone: 'milestones.6y', abilities: ['motor_abilities.6y_1', 'motor_abilities.6y_2', 'motor_abilities.6y_3', 'motor_abilities.6y_4', 'motor_abilities.6y_5'] }
];

export const avdData = [
  // CUIDADOS PESSOAIS
  {
    isAVD: true, // Flag para o FormStep identificar
    category: 'avd_category.personal_care',
    questions: [
      {
        id: 'avd_feeding',
        label: 'avd.feeding_title', // "A – Alimentação"
        options: [
          { value: 'avd.feeding_1', label: 'avd.feeding_1' }, 
          { value: 'avd.feeding_2', label: 'avd.feeding_2' }, 
          { value: 'avd.feeding_3', label: 'avd.feeding_3' }, 
          { value: 'avd.feeding_4', label: 'avd.feeding_4' }  
        ]
      },
      {
        id: 'avd_dressing',
        label: 'avd.dressing_title', // "B – Vestir-se"
        options: [
          { value: 'avd.dressing_1', label: 'avd.dressing_1' },
          { value: 'avd.dressing_2', label: 'avd.dressing_2' },
          { value: 'avd.dressing_3', label: 'avd.dressing_3' },
          { value: 'avd.dressing_4', label: 'avd.dressing_4' },
          { value: 'avd.dressing_5', label: 'avd.dressing_5' }
        ]
      },
      {
        id: 'avd_bathing',
        label: 'avd.bathing_title', // "C – Banho"
        options: [
          { value: 'avd.bathing_1', label: 'avd.bathing_1' },
          { value: 'avd.bathing_2', label: 'avd.bathing_2' },
          { value: 'avd.bathing_3', label: 'avd.bathing_3' },
          { value: 'avd.bathing_4', label: 'avd.bathing_4' },
          { value: 'avd.bathing_5', label: 'avd.bathing_5' }
        ]
      },
      {
        id: 'avd_toileting',
        label: 'avd.toileting_title', // "D – Eliminações fisiológicas"
        options: [
          { value: 'avd.toileting_1', label: 'avd.toileting_1' },
          { value: 'avd.toileting_2', label: 'avd.toileting_2' },
          { value: 'avd.toileting_3', label: 'avd.toileting_3' },
          { value: 'avd.toileting_4', label: 'avd.toileting_4' },
          { value: 'avd.toileting_5', label: 'avd.toileting_5' },
          { value: 'avd.toileting_6', label: 'avd.toileting_6' },
          { value: 'avd.toileting_7', label: 'avd.toileting_7' }
        ]
      },
      {
        id: 'avd_appearance',
        label: 'avd.appearance_title', // "E – Interesse na aparência pessoal"
        options: [
          { value: 'avd.appearance_1', label: 'avd.appearance_1' },
          { value: 'avd.appearance_2', label: 'avd.appearance_2' },
          { value: 'avd.appearance_3', label: 'avd.appearance_3' },
          { value: 'avd.appearance_4', label: 'avd.appearance_4' }
        ]
      }
    ]
  },
  // CUIDADOS DOMÉSTICOS
  {
    isAVD: true,
    category: 'avd_category.domestic',
    questions: [
      {
        id: 'avd_cooking',
        label: 'avd.cooking_title',
        options: [
          { value: 'avd.cooking_1', label: 'avd.cooking_1' },
          { value: 'avd.cooking_2', label: 'avd.cooking_2' },
          { value: 'avd.cooking_3', label: 'avd.cooking_3' },
          { value: 'avd.cooking_4', label: 'avd.cooking_4' },
          { value: 'avd.cooking_5', label: 'avd.cooking_5' }
        ]
      },
      {
        id: 'avd_table',
        label: 'avd.table_title',
        options: [
          { value: 'avd.table_1', label: 'avd.table_1' },
          { value: 'avd.table_2', label: 'avd.table_2' },
          { value: 'avd.table_3', label: 'avd.table_3' }
        ]
      },
      {
        id: 'avd_cleaning',
        label: 'avd.cleaning_title',
        options: [
          { value: 'avd.cleaning_1', label: 'avd.cleaning_1' },
          { value: 'avd.cleaning_2', label: 'avd.cleaning_2' },
          { value: 'avd.cleaning_3', label: 'avd.cleaning_3' },
          { value: 'avd.cleaning_4', label: 'avd.cleaning_4' },
          { value: 'avd.cleaning_5', label: 'avd.cleaning_5' },
          { value: 'avd.cleaning_6', label: 'avd.cleaning_6' },
          { value: 'avd.cleaning_7', label: 'avd.cleaning_7' },
          { value: 'avd.cleaning_8', label: 'avd.cleaning_8' }
        ]
      }
    ]
  },
  // TRABALHO E RECREAÇÃO
  {
    isAVD: true,
    category: 'avd_category.recreation',
    questions: [
      {
        id: 'avd_recreation',
        label: 'avd.recreation_title',
        options: [
          { value: 'avd.recreation_1', label: 'avd.recreation_1' },
          { value: 'avd.recreation_2', label: 'avd.recreation_2' },
          { value: 'avd.recreation_3', label: 'avd.recreation_3' },
          { value: 'avd.recreation_4', label: 'avd.recreation_4' },
          { value: 'avd.recreation_5', label: 'avd.recreation_5' },
          { value: 'avd.recreation_6', label: 'avd.recreation_6' }
        ]
      }
    ]
  },
  // LOCOMOÇÃO
  {
    isAVD: true,
    category: 'avd_category.locomotion',
    questions: [
      {
        id: 'avd_transport',
        label: 'avd.transport_title',
        options: [
          { value: 'avd.transport_1', label: 'avd.transport_1' },
          // { value: 'avd.transport_2', label: 'avd.transport_2' },
          { value: 'avd.transport_3', label: 'avd.transport_3' },
          { value: 'avd.transport_4', label: 'avd.transport_4' }
        ]
      },
      {
        id: 'avd_mobility',
        label: 'avd.mobility_title',
        options: [
          { value: 'avd.mobility_1', label: 'avd.mobility_1' },
          { value: 'avd.mobility_2', label: 'avd.mobility_2' },
          { value: 'avd.mobility_3', label: 'avd.mobility_3' },
          { value: 'avd.mobility_4', label: 'avd.mobility_4' }
        ]
      }
    ]
  },
  // COMUNICAÇÃO
  {
    isAVD: true,
    category: 'avd_category.communication',
    questions: [
      {
        id: 'avd_comm_general',
        label: 'avd.comm_general_title',
        options: [
          { value: 'avd.comm_general_1', label: 'avd.comm_general_1' },
          { value: 'avd.comm_general_2', label: 'avd.comm_general_2' },
          { value: 'avd.comm_general_3', label: 'avd.comm_general_3' }
        ]
      },
      {
        id: 'avd_phone',
        label: 'avd.phone_title',
        options: [
          { value: 'avd.phone_1', label: 'avd.phone_1' },
          { value: 'avd.phone_2', label: 'avd.phone_2' },
          { value: 'avd.phone_3', label: 'avd.phone_3' },
          { value: 'avd.phone_4', label: 'avd.phone_4' }
        ]
      },
      {
        id: 'avd_conversation',
        label: 'avd.conversation_title',
        options: [
          { value: 'avd.conversation_1', label: 'avd.conversation_1' },
          { value: 'avd.conversation_2', label: 'avd.conversation_2' },
          { value: 'avd.conversation_3', label: 'avd.conversation_3' },
          { value: 'avd.conversation_4', label: 'avd.conversation_4' }
        ]
      },
      {
        id: 'avd_comprehension',
        label: 'avd.comprehension_title',
        options: [
          { value: 'avd.comprehension_1', label: 'avd.comprehension_1' },
          { value: 'avd.comprehension_2', label: 'avd.comprehension_2' },
          { value: 'avd.comprehension_3', label: 'avd.comprehension_3' }
        ]
      }
    ]
  }
];

// Mapa para acesso fácil via chaves de steps
export const pifDetailedDataMap = {
  'pif_steps.play': fasesDoBrincarData,
  'pif_steps.language': desenvolvimentoLinguagemData,
  'pif_steps.cognition': desenvolvimentoCognicaoData,
  'pif_steps.social_emotional': desenvolvimentoSocioemocionalData,
  'pif_steps.motor': desenvolvimentoMotricidadeData,
  'pif_steps.avd': avdData
};

export const pifSimpleData = {};