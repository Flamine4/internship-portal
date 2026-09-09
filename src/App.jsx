import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Inscription from './pages/Inscription'
import Connexion from './pages/Connexion'
import TableauDeBord from './pages/TableauDeBord'
import Candidature from './pages/Candidature'
import Administration from './pages/Administration'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/inscription" element={<Inscription />} />
        <Route path="/connexion" element={<Connexion />} />
        <Route path="/dashboard" element={<TableauDeBord />} />
        <Route path="/candidature" element={<Candidature />} />
        <Route path="/administration" element={<Administration />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
