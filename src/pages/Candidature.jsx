import { useState } from 'react'
import { supabase } from '../services/supabaseClient'

function Candidature() {
  const [school, setSchool] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [internshipPeriod, setInternshipPeriod] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage('Tu dois être connecté pour envoyer une candidature.')
      setLoading(false)
      return
    }

    // Mise à jour du profil
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        school,
        specialty,
      })
      .eq('id', user.id)

    if (profileError) {
      setMessage('Erreur lors de la mise à jour du profil.')
      setLoading(false)
      return
    }

    // Création de la candidature
    const { error: applicationError } = await supabase
      .from('applications')
      .insert({
        candidate_id: user.id,
        internship_period: internshipPeriod,
      })

    if (applicationError) {
      setMessage(applicationError.message)
      setLoading(false)
      return
    }

    setMessage('Candidature envoyée avec succès !')
    setLoading(false)
  }

  return (
    <div>
      <h1>Ma candidature</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label>École</label>
          <br />
          <input
            type="text"
            placeholder="Ex : IFRI"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            required
          />
        </div>

        <br />

        <div>
          <label>Spécialité</label>
          <br />
          <input
            type="text"
            placeholder="Ex : Intelligence Artificielle"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            required
          />
        </div>

        <br />

        <div>
          <label>Période de stage</label>
          <br />
          <input
            type="text"
            placeholder="Ex : Juin - Août 2026"
            value={internshipPeriod}
            onChange={(e) => setInternshipPeriod(e.target.value)}
            required
          />
        </div>

        <br />

        <button type="submit" disabled={loading}>
          {loading ? 'Envoi...' : 'Envoyer ma candidature'}
        </button>
      </form>

      {message && <p>{message}</p>}
    </div>
  )
}

export default Candidature