import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // <--- LINHA OBRIGATÓRIA PARA MOBILE
  server: {host: true, // <--- ESSENCIAL PARA ACESSO VIA WI-FI (Exibe o Network IP)
    port: 5000, // Mantém a porta 5000 que você já usa
    proxy: {
      // Redireciona requisições de /api para o backend
      '/api': {
        target: 'http://localhost:3077',
        changeOrigin: true,
        secure: false,
        // Remove o prefixo '/api' antes de encaminhar a requisição
        rewrite: (path) => path.replace(/^\/api/, ''),
        bypass: (req) => {
          // Ignora requisições para arquivos estáticos
          if (req.url.match(/\.(svg|png|jpg|jpeg|gif|ico)$/)) {
            return req.url; // Serve diretamente de public/
          }
        },
      },
    },
  },
})