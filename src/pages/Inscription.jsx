import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'

function Inscription() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  async function handleRegister(e) {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setLoading(false)

    setMessage('Compte créé avec succès !')

    setTimeout(() => {
      navigate('/connexion')
    }, 1200)
  }

  return (
    <div className="page-auth">
      <div className="auth-card">
        <div className="auth-logo">
          <span>IP</span>
        </div>

        <h1>Créer un compte</h1>

        <p className="auth-subtitle">
          Rejoins Internship Portal pour suivre ta candidature.
        </p>

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label htmlFor="fullName">Nom complet</label>

            <input
              id="fullName"
              type="text"
              placeholder="Ex : Flamine Ayela"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Adresse e-mail</label>

            <input
              id="email"
              type="email"
              placeholder="exemple@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>

            <input
              id="password"
              type="password"
              placeholder="Choisis un mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        {message && (
          <div className="success-message">
            {message}
          </div>
        )}

        <p className="auth-footer">
          Tu as déjà un compte ?{' '}
          <Link to="/connexion">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Inscription