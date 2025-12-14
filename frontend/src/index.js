import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './context';
import ThemeConfigProvider from './Components/ThemeConfigProvider';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <ThemeProvider>
      <ThemeConfigProvider>
        <App />
      </ThemeConfigProvider>
    </ThemeProvider>
  </BrowserRouter>
);

reportWebVitals();
