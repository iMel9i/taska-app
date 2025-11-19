import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { SDKProvider } from '@tma.js/sdk-react';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SDKProvider options={{ acceptCustomStyles: true, cssVars: true }}>
      <App />
    </SDKProvider>
  </React.StrictMode>,
); 
