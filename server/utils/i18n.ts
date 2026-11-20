import { Request } from 'express';

// --- INTERFACES ---
export interface ITranslations {
  registrationSuccessful: string;
  registrationError: string;
  verifiedEmail: string;
  successVerified: string;
  invalidToken: string;
  verifySubject: string;
  verifyText: (nome: string, link: string) => string;
  verificationEmailSent: string;
  verificationEmailError: string;
  resetSubject: string;
  resetText: (nome: string, link: string) => string;
  resetAlert: string;
  pifSubject: (nomeCrianca: string) => string;
  pifText: (nomeCrianca: string) => string;
  aiInstruction: string;
  errorVerifyEmail: string;
  errorCredentials: string;
  errorSignatureExpired: string;
  errorServerLogin: string;
  serverError: string;
  emailNotFound: string;
  resendVerificationSubject: string;
  resendVerificationText: (nome: string, link: string) => string;
  mandatoryFields: string;
  pwdnotmatch: string;
  mailalready: string;
  usrnotfound: string;
  pwdchanged: string;
  oldtoken: string;
  pwdnew: string;
  nopif: string;
  noData: string;
  noCredits: string;
  serverErrorCredits: string;
  planNotFound: string;
  draftSaved: string;
}

export interface II18nEmails {
  pt: ITranslations;
  en: ITranslations;
  es: ITranslations;
}

export const i18nEmails: II18nEmails = {
  pt: {
    registrationSuccessful: 'Cadastro realizado com sucesso. Verifique seu e-mail.',
    registrationError: 'Erro ao cadastrar',
    verifiedEmail: 'E-mail já verificado ou usuário não encontrado',
    successVerified: 'E-mail verificado com sucesso! Você pode fazer login agora.',
    invalidToken: 'Token inválido ou expirado',
    verifySubject: 'Verificação de E-mail - CognaCare',
    verifyText: (nome: string, link: string) => `Olá ${nome},\n\nObrigado por se cadastrar! Clique no link abaixo para verificar seu e-mail:\n\n${link}\n\nEste link expira em 1 hora.\n\nAtenciosamente,\nEquipe CognaCare`,
    verificationEmailSent: 'E-mail de verificação reenviado com sucesso',
    verificationEmailError: 'Erro ao reenviar e-mail de verificação:',
    resetSubject: 'Redefinição de Senha - CognaCare',
    resetText: (nome: string, link: string) => `Olá ${nome},\n\nVocê solicitou a redefinição de sua senha. Clique no link abaixo:\n\n${link}\n\nEste link expira em 1 hora.\n\nAtenciosamente,\nEquipe CognaCare`,
    resetAlert: 'O link para redefinição da senha foi enviado com sucesso para o seu e-mail',
    pifSubject: (nomeCrianca: string) => `Plano de Intervenção Familiar (PIF) - ${nomeCrianca}`,
    pifText: (nomeCrianca: string) => `Olá,\n\nO PIF do(a) ${nomeCrianca} está pronto!\n\nBaixe o anexo para visualizar as estratégias personalizadas.\n\nAtenciosamente,\nEquipe CognaCare`,
    aiInstruction: "IMPORTANTE: Responda estritamente em PORTUGUÊS DO BRASIL.",
    errorVerifyEmail: 'E-mail não verificado. Verifique sua caixa de entrada.',
    errorCredentials: 'Credenciais inválidas.',
    errorSignatureExpired: 'Sua assinatura está inativa ou expirou. Por favor, renove seu plano para continuar.',
    errorServerLogin: 'Erro no servidor durante o login.',
    serverError: 'Erro no servidor',
    emailNotFound: 'E-mail não encontrado',
    resendVerificationSubject: 'Reenvio: Verificação de E-mail - CognaCare',
    resendVerificationText: (nome: string, link: string) => `Olá ${nome},\n\nVocê solicitou o reenvio do link de verificação. Clique no link abaixo para verificar seu e-mail:\n\n${link}\n\nEste link expira em 1 hora. Se você não solicitou isso, ignore este e-mail.\n\nAtenciosamente,\nEquipe CognaCare`,
    mandatoryFields: 'Todos os campos são obrigatórios.',
    pwdnotmatch: 'As senhas não coincidem',
    mailalready: 'E-mail já cadastrado',
    usrnotfound: 'Usuário não encontrado.',
    pwdchanged: 'Senha alterada com sucesso!',
    oldtoken: 'Token inválido ou expirado',
    pwdnew: 'Senha redefinida com sucesso! Redirecionando para o Login em 5 segundos...',
    nopif: 'Nenhum plano anterior encontrado.',
    noData: 'Dados insuficientes.',
    noCredits: 'Créditos insuficientes.',
    serverErrorCredits: 'Erro ao processar. Créditos estornados.',
    planNotFound: 'Plano não encontrado.',
    draftSaved: 'Rascunho salvo com sucesso!',
  },
  en: {
    registrationSuccessful: 'Registration successful. Check your email.',
    registrationError: 'Error registering',
    verifiedEmail: 'Email already verified or user not found.',
    successVerified: 'Email successfully verified! You can log in now.',
    invalidToken: 'Invalid or expired token',
    verifySubject: 'Email Verification - CognaCare',
    verifyText: (nome: string, link: string) => `Hello ${nome},\n\nThanks for signing up! Click the link below to verify your email:\n\n${link}\n\nThis link expires in 1 hour.\n\nBest regards,\nCognaCare Team`,
    verificationEmailSent: 'Verification email successfully resent.',
    verificationEmailError: 'Error resending verification email:',
    resetSubject: 'Password Reset - CognaCare',
    resetText: (nome: string, link: string) => `Hello ${nome},\n\nYou requested a password reset. Click the link below:\n\n${link}\n\nThis link expires in 1 hour.\n\nBest regards,\nCognaCare Team`,
    resetAlert: 'The password reset link has been successfully sent to your email.',
    pifSubject: (nomeCrianca: string) => `Family Intervention Plan (FIP) - ${nomeCrianca}`,
    pifText: (nomeCrianca: string) => `Hello,\n\nThe FIP for ${nomeCrianca} is ready!\n\nDownload the attachment to view your personalized strategies.\n\nBest regards,\nCognaCare Team`,
    aiInstruction: "IMPORTANT: You MUST write the entire response in ENGLISH.",
    errorVerifyEmail: 'This email has not been verified. Please check your inbox.',
    errorCredentials: 'Invalid credentials.',
    errorSignatureExpired: 'Your subscription is inactive or has expired. Please renew your plan to continue.',
    errorServerLogin: 'Server error during login.',
    serverError: 'Server error',
    emailNotFound: 'Email not found',
    resendVerificationSubject: 'Resend: Email Verification - CognaCare',
    resendVerificationText: (nome: string, link: string) => `Hello ${nome},\n\nYou requested a resend of the verification link. Click the link below to verify your email:\n\n${link}\n\nThis link expires in 1 hour. If you did not request this, please ignore this email.\n\nSincerely,\nCognaCare Team`,
    mandatoryFields: 'All fields are required.',
    pwdnotmatch: `The passwords don't match.`,
    mailalready: 'Email already registered',
    usrnotfound: 'User not found.',
    pwdchanged: 'Password changed successfully!',
    oldtoken: 'Invalid or expired token',
    pwdnew: 'Password reset successfully! Redirecting to login in 5 seconds...',
    nopif: 'No previous plans found.',
    noData: 'Insufficient data.',
    noCredits: 'Insufficient credit.',
    serverErrorCredits: 'Error processing. Credits reversed.',
    planNotFound: 'Plan not found.',
    draftSaved: 'Draft saved successfully!',
  },
  es: {
    registrationSuccessful: 'Registro exitoso. Revisa tu correo electrónico.',
    registrationError: 'Error al registrarse',
    verifiedEmail: 'Correo electrónico ya verificado o usuario no encontrado.',
    successVerified: '¡Correo electrónico verificado! Puedes iniciar sesión ahora.',
    invalidToken: 'Token inválido o caducado',
    verifySubject: 'Verificación de Correo - CognaCare',
    verifyText: (nome: string, link: string) => `Hola ${nome},\n\n¡Gracias por registrarte! Haz clic en el enlace de abajo para verificar tu correo:\n\n${link}\n\nEste enlace caduca en 1 hora.\n\nSaludos cordiales,\nEquipo CognaCare`,
    verificationEmailSent: 'El correo electrónico de verificación se reenvió correctamente.',
    verificationEmailError: 'Error al reenviar el correo electrónico de verificación:',
    resetSubject: 'Restablecimiento de Contraseña - CognaCare',
    resetText: (nome: string, link: string) => `Hola ${nome},\n\nSolicitaste restablecer tu contraseña. Haz clic en el enlace de abajo:\n\n${link}\n\nEste enlace caduca en 1 hora.\n\nSaludos cordiales,\nEquipo CognaCare`,
    resetAlert: 'El enlace para restablecer la contraseña se ha enviado correctamente a su correo electrónico.',
    pifSubject: (nomeCrianca: string) => `Plan de Intervención Familiar (PIF) - ${nomeCrianca}`,
    pifText: (nomeCrianca: string) => `Hola,\n\n¡El PIF de ${nomeCrianca} está listo!\n\nDescarga el archivo adjunto para ver las estrategias personalizadas.\n\nSaludos cordiales,\nEquipo CognaCare`,
    aiInstruction: "IMPORTANTE: Debes escribir toda la respuesta en ESPAÑOL.",
    errorVerifyEmail: 'Este correo electrónico no ha sido verificado. Por favor, revise su bandeja de entrada.',
    errorCredentials: 'Credenciales inválidas.',
    errorSignatureExpired: 'Tu suscripción está inactiva o ha expirado. Renueva tu plan para continuar.',
    errorServerLogin: 'Error del servidor durante el inicio de sesión.',
    serverError: 'Error del servidor',
    emailNotFound: 'Correo electrónico no encontrado',
    resendVerificationSubject: 'Reenviar: Verificación de correo electrónico - CognaCare',
    resendVerificationText: (nome: string, link: string) => `Hola ${nome}: Solicitó que le reenviáramos el enlace de verificación. Haga clic en el siguiente enlace para verificar su correo electrónico: ${link} Este enlace caduca en 1 hora. Si no lo solicitó, ignore este correo electrónico. Atentamente, El equipo de CognaCare.`,
    mandatoryFields: 'Todos los campos son obligatorios.',
    pwdnotmatch: 'Las contraseñas no coinciden.',
    mailalready: 'Correo electrónico ya registrado',
    usrnotfound: 'Usuario no encontrado.',
    pwdchanged: '¡Contraseña cambiada exitosamente!',
    oldtoken: 'Token inválido o caducado',
    pwdnew: '¡Contraseña restablecida correctamente! Redireccionando al inicio de sesión en 5 segundos...',
    nopif: 'No se encontraron planes previos.',
    noData: 'Datos insuficientes.',
    noCredits: 'Créditos insuficientes.',
    serverErrorCredits: 'Error de procesamiento. Créditos invertidos.',
    planNotFound: 'Plan no encontrado.',
    draftSaved: '¡Borrador guardado exitosamente!',
  }
};

/**
 * Função auxiliar para detetar idioma da requisição
 */
export const getLanguage = (req: Request | any): 'pt' | 'en' | 'es' => {
  // A tipagem 'as string | undefined' assegura que não quebra caso o header seja um array
  const langHeader = (req.headers['accept-language'] as string | undefined) || 'en';

  if (langHeader.startsWith('pt')) return 'pt';
  if (langHeader.startsWith('es')) return 'es';

  return 'en';
};