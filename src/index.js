// src/index.js أو src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
//import { BrowserRouter } from 'react-router-dom';
import { HashRouter } from 'react-router-dom';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter
      future={{
        v7_startTransition: true,      // ✅ لإزالة التحذير الأول
        v7_relativeSplatPath: true,    // ✅ لإزالة التحذير الثاني
      }}
    >
      <App />
    </HashRouter>
  </React.StrictMode>
);