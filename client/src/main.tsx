import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import App from './App'; // <-- Removido o .jsx
import './index.css';
import './i18n';

// Se estiver rodando nativo (Android/iOS), usa HashRouter. Se for Web, usa BrowserRouter.
const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
);