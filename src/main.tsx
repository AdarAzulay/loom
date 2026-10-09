import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { LibraryStore } from './app/libraryStore'
import { IndexedDbRepository } from './services/storage/indexedDb'
import './styles/tokens.css'
import './styles/app.css'

const store = new LibraryStore(new IndexedDbRepository())
void store.load()
createRoot(document.getElementById('root')!).render(<StrictMode><App store={store} /></StrictMode>)
