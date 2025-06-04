import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './tailwind.css'
import { App } from '../App/App.tsx'
import { Provider } from 'react-redux'
import { store } from '../../store.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
