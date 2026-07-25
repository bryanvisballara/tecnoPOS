import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './styles/index.css';

const BUILD_ID = '2026-07-25-edit-dish-v6';

async function clearStaleClient() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* ignore */
  }

  const prev = localStorage.getItem('tp_build');
  if (prev && prev !== BUILD_ID) {
    localStorage.setItem('tp_build', BUILD_ID);
    const url = new URL(window.location.href);
    url.searchParams.set('_b', BUILD_ID);
    window.location.replace(url.toString());
    return false;
  }
  localStorage.setItem('tp_build', BUILD_ID);
  return true;
}

clearStaleClient().then((ok) => {
  if (!ok) return;
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>
  );
});
