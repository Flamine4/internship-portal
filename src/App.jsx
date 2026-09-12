import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Inscription from './pages/Inscription'
import Connexion from './pages/Connexion'
import TableauDeBord from './pages/TableauDeBord'
import Candidature from './pages/Candidature'
import Administration from './pages/Administration'

import ProtectionRoute from './components/ProtectionRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Pages accessibles sans connexion */}
        <Route path="/inscription" element={<Inscription />} />
        <Route path="/connexion" element={<Connexion />} />

        {/* Pages réservées aux utilisateurs connectés */}
        <Route
          path="/dashboard"
          element={
            <ProtectionRoute>
              <TableauDeBord />
            </ProtectionRoute>
          }
        />

        <Route
          path="/candidature"
          element={
            <ProtectionRoute>
              <Candidature />
            </ProtectionRoute>
          }
        />

        {/* Page réservée aux administrateurs */}
        <Route
          path="/administration"
          element={
            <ProtectionRoute adminOnly>
              <Administration />
            </ProtectionRoute>
          }
        />

        {/* Route par défaut */}
        <Route path="*" element={<Connexion />} />

      </Routes>
    </BrowserRouter>
  )
}

export default App