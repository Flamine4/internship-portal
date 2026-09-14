import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'

function Connexion() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage('Adresse e-mail ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    setLoading(false)

    // Vérifier le rôle pour envoyer l'utilisateur au bon espace
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data: profil } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profil?.role === 'admin') {
      navigate('/administration')
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="page-auth">
      <div className="auth-card">
        <div className="auth-logo">
          <span>IP</span>
        </div>

        <h1>Bienvenue 👋</h1>

        <p className="auth-subtitle">
          Connecte-toi à ton espace Internship Portal.
        </p>

        <form onSubmit={handleLogin}>
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
              placeholder="Ton mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        {message && (
          <div className="error-message">
            {message}
          </div>
        )}

        <p className="auth-footer">
          Tu n'as pas encore de compte ?{' '}
          <Link to="/inscription">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Connexion