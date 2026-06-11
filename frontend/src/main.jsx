import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // Global Tailwind CSS directives
import axios from 'axios'

/**
 * Production/Tunneling Configuration:
 * Using NGROK to expose the local backend for cross-device testing.
 */
const ACTUAL_BACKEND_URL = "https://pisciform-osiered-joye.ngrok-free.dev";

/**
 * Axios Request Interceptor:
 * Middleware to dynamically rewrite local API requests to the remote tunnel URL.
 * Automatically injects headers to bypass Ngrok browser security warnings.
 */
axios.interceptors.request.use((config) => {
    // Dynamic URL Rewriting: Maps localhost stream to Ngrok gateway
    if (config.url && config.url.includes('http://localhost:5000')) {
        config.url = config.url.replace('http://localhost:5000', ACTUAL_BACKEND_URL);
    }
    
    // Ngrok-specific header to suppress interstitial warning pages
    config.headers['ngrok-skip-browser-warning'] = 'true';
    
    return config;
}, (error) => {
    return Promise.reject(error);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)