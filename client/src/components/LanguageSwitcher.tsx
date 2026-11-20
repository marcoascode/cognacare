import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconButton,
  Dialog,
  DialogTitle,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Tooltip,
  SxProps,
  Theme
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import CheckIcon from '@mui/icons-material/Check';

// Configuração dos idiomas disponíveis
const languages = [
  { code: 'pt', label: 'Português (Brasil)' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' }
];

// Substitui o PropTypes antigo. Usamos SxProps nativo do Material UI.
interface LanguageSwitcherProps {
  sx?: SxProps<Theme>;
}

export default function LanguageSwitcher({ sx }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState<boolean>(false);

  // Normaliza o idioma atual (pega apenas os 2 primeiros caracteres para comparação simples 'pt-BR' -> 'pt')
  // Isso evita problemas se o navegador mandar 'en-US' e nossa chave for 'en'
  const currentLangCode = i18n.language ? i18n.language.substring(0, 2) : 'pt';

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleLanguageSelect = (langCode: string) => {
    i18n.changeLanguage(langCode);
    handleClose();
  };

  return (
    <>
      {/* Botão de Gatilho (Ícone) */}
      <Tooltip title={t('common.change_language') as string}>
        <IconButton 
          onClick={handleOpen} 
          sx={{ ...sx }} 
          color="inherit"
          aria-label="alterar idioma"
        >
          <LanguageIcon />
        </IconButton>
      </Tooltip>

      {/* Dialog de Seleção */}
      <Dialog onClose={handleClose} open={open}>
        <DialogTitle>
            {/* Você pode adicionar uma chave 'choose_language' no seu translation.json depois */}
            {t('common.choose_language')}
        </DialogTitle>
        <List sx={{ pt: 0 }}>
          {languages.map((language) => (
            <ListItem disableGutters key={language.code}>
              <ListItemButton onClick={() => handleLanguageSelect(language.code)}>
                <ListItemText primary={language.label} />
                {/* Mostra um check se for o idioma atual */}
                {currentLangCode === language.code && (
                    <ListItemIcon sx={{ minWidth: 'auto' }}>
                        <CheckIcon color="primary" />
                    </ListItemIcon>
                )}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Dialog>
    </>
  );
}