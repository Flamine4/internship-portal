import { useState } from 'react'
import { supabase } from '../services/supabaseClient'

function Inscription() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [message, setMessage] = useState('')

  async function handleRegister(e) {
    e.preventDefault()
    setMessage('')

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
      return
    }

    setMessage(
      'Inscription réussie ! Vérifie ton adresse e-mail si nécessaire.'
    )
  }

  return (
    <div>
      <h1>Créer un compte</h1>

      <form onSubmit={handleRegister}>
        <input
          type="text"
          placeholder="Nom complet"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">S'inscrire</button>
      </form>

      {message && <p>{message}</p>}
    </div>
  )
}

export default Inscription
