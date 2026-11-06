import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { registerServiceWorker } from './ui/swUpdate';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline support (production only): caches this app's own files in the browser. Nothing is sent anywhere.
if (import.meta.env.PROD) registerServiceWorker(`${import.meta.env.BASE_URL}sw.js`);
