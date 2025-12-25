import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { AuthProvider } from './context/AuthContext.tsx'

import { DataProvider } from './context/DataContext.tsx'
import { SuggestionProvider } from './context/SuggestionContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <DataProvider>
        <SuggestionProvider>
          <App />
        </SuggestionProvider>
      </DataProvider>
    </AuthProvider>
  </StrictMode>,
)
