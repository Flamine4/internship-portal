import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Inscription from './pages/Inscription'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/inscription" element={<Inscription />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App