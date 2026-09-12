import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'

function Candidature() {
  const [school, setSchool] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [internshipPeriod, setInternshipPeriod] = useState('')

  const [candidatureExistante, setCandidatureExistante] = useState(null)
  const [loading, setLoading] = useState(true)
  const [envoi, setEnvoi] = useState(false)
  const [message, setMessage] = useState('')

  const navigate = useNavigate()

  useEffect(() => {
    chargerCandidature()
  }, [])

  async function chargerCandidature() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      navigate('/connexion')
      return
    }

    // Récupérer les informations du profil
    const { data: profil, error: profilError } = await supabase
      .from('profiles')
      .select('school, specialty')
      .eq('id', user.id)
      .single()

    if (profilError) {
      setMessage('Impossible de récupérer ton profil.')
      setLoading(false)
      return
    }

    setSchool(profil?.school || '')
    setSpecialty(profil?.specialty || '')

    // Vérifier si une candidature existe déjà
    const { data: candidature, error: candidatureError } = await supabase
      .from('applications')
      .select('*')
      .eq('candidate_id', user.id)
      .maybeSingle()

    if (candidatureError) {
      setMessage('Impossible de vérifier ta candidature.')
      setLoading(false)
      return
    }

    setCandidatureExistante(candidature)

    if (candidature) {
      setInternshipPeriod(candidature.internship_period || '')
    }

    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
    setEnvoi(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage('Tu dois être connecté pour envoyer une candidature.')
      setEnvoi(false)
      return
    }

    // Vérification supplémentaire pour éviter les doublons
    const { data: candidatureExistante, error: verificationError } =
      await supabase
        .from('applications')
        .select('id')
        .eq('candidate_id', user.id)
        .maybeSingle()

    if (verificationError) {
      setMessage('Impossible de vérifier ta candidature.')
      setEnvoi(false)
      return
    }

    if (candidatureExistante) {
      setCandidatureExistante(candidatureExistante)
      setMessage('Tu as déjà envoyé une candidature.')
      setEnvoi(false)
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
      setEnvoi(false)
      return
    }

    // Création de la candidature
    const { data: nouvelleCandidature, error: applicationError } =
      await supabase
        .from('applications')
        .insert({
          candidate_id: user.id,
          internship_period: internshipPeriod,
        })
        .select()
        .single()

    if (applicationError) {
      setMessage(`Erreur : ${applicationError.message}`)
      setEnvoi(false)
      return
    }

    setCandidatureExistante(nouvelleCandidature)

    setMessage('Candidature envoyée avec succès !')
    setEnvoi(false)
  }

  if (loading) {
    return <p>Chargement...</p>
  }

  return (
    <div>
      <h1>Ma candidature</h1>

      {candidatureExistante ? (
        <div>
          <h2>Tu as déjà envoyé ta candidature ✅</h2>

          <p>
            <strong>École :</strong> {school || 'Non renseignée'}
          </p>

          <p>
            <strong>Spécialité :</strong> {specialty || 'Non renseignée'}
          </p>

          <p>
            <strong>Période de stage :</strong>{' '}
            {candidatureExistante.internship_period || 'Non renseignée'}
          </p>

          <p>
            <strong>Statut :</strong>{' '}
            {candidatureExistante.status}
          </p>

          <button onClick={() => navigate('/dashboard')}>
            Retour au tableau de bord
          </button>
        </div>
      ) : (
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

          <button type="submit" disabled={envoi}>
            {envoi ? 'Envoi...' : 'Envoyer ma candidature'}
          </button>
        </form>
      )}

      {message && <p>{message}</p>}
    </div>
  )
}

export default Candidature