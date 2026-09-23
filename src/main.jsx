import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { redirectLegacyHash } from './lib/routes.js';
import './styles/kit.css';
import './styles/weather.css';

redirectLegacyHash();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
