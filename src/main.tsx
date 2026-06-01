import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// StrictMode removed: it double-invokes effects which tears down socket listeners
createRoot(document.getElementById('root')!).render(<App />)
