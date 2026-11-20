import csurf from 'csurf';

export const csrfProtection = csurf({
  cookie: {
    key: '_csrf', // Nome explícito do cookie
    httpOnly: true,
    secure: false, // Temporariamente para HTTP
    sameSite: 'lax', // 'none' exige secure, então usamos 'lax'
    // secure: process.env.NODE_ENV === 'production', // True em produção para HTTPS
    // sameSite: 'none', // Necessário se o frontend e backend estiverem em subdomínios diferentes ou domínios distintos
    maxAge: 3600 * 1000, // 1 hora
  },
});