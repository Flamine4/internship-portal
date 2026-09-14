import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'

function Candidature() {
  const [school, setSchool] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [internshipPeriod, setInternshipPeriod] = useState('')

  const [candidatureExistante, setCandidatureExistante] = useState(null)
  const [recrutement, setRecrutement] = useState(null)

  const [loading, setLoading] = useState(true)
  const [envoi, setEnvoi] = useState(false)
  const [message, setMessage] = useState('')
  const [typeMessage, setTypeMessage] = useState('')

  const navigate = useNavigate()

  useEffect(() => {
    chargerDonnees()
  }, [])

  async function chargerDonnees() {
    setLoading(true)
    setMessage('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      navigate('/connexion')
      return
    }

    // Récupérer le profil
    const { data: profil, error: profilError } = await supabase
      .from('profiles')
      .select('school, specialty')
      .eq('id', user.id)
      .single()

    if (profilError) {
      setMessage('Impossible de récupérer ton profil.')
      setTypeMessage('error')
      setLoading(false)
      return
    }

    setSchool(profil?.school || '')
    setSpecialty(profil?.specialty || '')

    // Vérifier si une candidature existe déjà
    const { data: candidature, error: candidatureError } =
      await supabase
        .from('applications')
        .select('*')
        .eq('candidate_id', user.id)
        .maybeSingle()

    if (candidatureError) {
      setMessage('Impossible de vérifier ta candidature.')
      setTypeMessage('error')
      setLoading(false)
      return
    }

    setCandidatureExistante(candidature)

    if (candidature) {
      setInternshipPeriod(candidature.internship_period || '')
    }

    // Récupérer les paramètres du recrutement
    const { data: recrutementData, error: recrutementError } =
      await supabase
        .from('recruitment_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle()

    if (recrutementError) {
      setMessage(
        `Impossible de récupérer les paramètres du recrutement : ${recrutementError.message}`
      )
      setTypeMessage('error')
    } else {
      setRecrutement(recrutementData)
    }

    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    setMessage('')
    setTypeMessage('')
    setEnvoi(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage('Tu dois être connecté pour envoyer une candidature.')
      setTypeMessage('error')
      setEnvoi(false)
      return
    }

    if (!school.trim() || !specialty.trim() || !internshipPeriod.trim()) {
      setMessage('Veuillez remplir tous les champs.')
      setTypeMessage('error')
      setEnvoi(false)
      return
    }

    // Vérification côté interface
    if (!recrutement?.is_active) {
      setMessage('Le recrutement est actuellement fermé.')
      setTypeMessage('error')
      setEnvoi(false)
      return
    }

    if (recrutement.available_spots <= 0) {
      setMessage('Il n’y a plus de place disponible.')
      setTypeMessage('error')
      setEnvoi(false)
      return
    }

    // Vérification contre les doublons
    const {
      data: candidatureExistante,
      error: verificationError,
    } = await supabase
      .from('applications')
      .select('id')
      .eq('candidate_id', user.id)
      .maybeSingle()

    if (verificationError) {
      setMessage('Impossible de vérifier ta candidature.')
      setTypeMessage('error')
      setEnvoi(false)
      return
    }

    if (candidatureExistante) {
      setCandidatureExistante(candidatureExistante)
      setMessage('Tu as déjà envoyé une candidature.')
      setTypeMessage('error')
      setEnvoi(false)
      return
    }

    // Envoyer via la fonction sécurisée Supabase
    const { data, error } = await supabase.rpc(
      'envoyer_candidature',
      {
        p_school: school.trim(),
        p_specialty: specialty.trim(),
        p_internship_period: internshipPeriod.trim(),
      }
    )

    if (error) {
      setMessage(`Erreur : ${error.message}`)
      setTypeMessage('error')
      setEnvoi(false)
      return
    }

    setCandidatureExistante(data)

    setRecrutement((ancien) => ({
      ...ancien,
      available_spots: ancien.available_spots - 1,
    }))

    setMessage('Candidature envoyée avec succès !')
    setTypeMessage('success')
    setEnvoi(false)
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Chargement de ta candidature...</p>
      </div>
    )
  }

  return (
    <div className="candidature-page">

      {/* En-tête */}
      <header className="candidature-header">
        <div className="candidature-header-content">

          <div className="dashboard-brand">
            <div className="dashboard-logo">
              IP
            </div>

            <div>
              <h1>Internship Portal</h1>
              <span>Espace candidat</span>
            </div>
          </div>

          <button
            className="header-secondary-button"
            onClick={() => navigate('/dashboard')}
          >
            ← Tableau de bord
          </button>

        </div>
      </header>

      <main className="candidature-main">

        {/* Introduction */}
        <div className="candidature-introduction">
          <p className="page-label">
            CANDIDATURE
          </p>

          <h2>
            Construis ton dossier de candidature
          </h2>

          <p>
            Renseigne tes informations pour participer
            au processus de recrutement.
          </p>
        </div>

        {/* Candidature déjà envoyée */}
        {candidatureExistante ? (

          <section className="application-result">

            <div className="result-icon">
              ✓
            </div>

            <h2>
              Candidature envoyée
            </h2>

            <p className="result-description">
              Tu as déjà envoyé ta candidature.
              Tu peux suivre son évolution depuis ton tableau de bord.
            </p>

            <div className="submitted-info">

              <div>
                <span>École</span>
                <strong>
                  {school || 'Non renseignée'}
                </strong>
              </div>

              <div>
                <span>Spécialité</span>
                <strong>
                  {specialty || 'Non renseignée'}
                </strong>
              </div>

              <div>
                <span>Période de stage</span>
                <strong>
                  {candidatureExistante.internship_period ||
                    'Non renseignée'}
                </strong>
              </div>

              <div>
                <span>Statut</span>
                <strong>
                  {candidatureExistante.status === 'registration'
                    ? 'Inscription'
                    : candidatureExistante.status}
                </strong>
              </div>

            </div>

            <button
              className="primary-button"
              onClick={() => navigate('/dashboard')}
            >
              Voir ma progression
            </button>

          </section>

        ) : !recrutement?.is_active ? (

          /* Recrutement fermé */
          <section className="application-result closed-result">

            <div className="result-icon closed-icon">
              🔒
            </div>

            <h2>
              Recrutement fermé
            </h2>

            <p className="result-description">
              Les candidatures sont actuellement fermées.
              Tu pourras revenir lorsque le recrutement sera ouvert.
            </p>

            <button
              className="primary-button"
              onClick={() => navigate('/dashboard')}
            >
              Retour au tableau de bord
            </button>

          </section>

        ) : recrutement?.available_spots <= 0 ? (

          /* Plus de places */
          <section className="application-result closed-result">

            <div className="result-icon closed-icon">
              ⏳
            </div>

            <h2>
              Plus de places disponibles
            </h2>

            <p className="result-description">
              Toutes les places disponibles ont été attribuées.
              Merci pour ton intérêt.
            </p>

            <button
              className="primary-button"
              onClick={() => navigate('/dashboard')}
            >
              Retour au tableau de bord
            </button>

          </section>

        ) : (

          /* Formulaire */
          <section className="application-form-card">

            <div className="available-spots">

              <div className="spots-icon">
                🎯
              </div>

              <div>
                <span>
                  PLACES DISPONIBLES
                </span>

                <strong>
                  {recrutement.available_spots}
                </strong>
              </div>

            </div>

            <div className="form-heading">
              <h2>
                Informations de candidature
              </h2>

              <p>
                Tous les champs sont obligatoires.
              </p>
            </div>

            <form onSubmit={handleSubmit}>

              <div className="form-row">

                <div className="form-field">
                  <label htmlFor="school">
                    École
                  </label>

                  <input
                    id="school"
                    type="text"
                    placeholder="Ex : IFRI"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="specialty">
                    Spécialité
                  </label>

                  <input
                    id="specialty"
                    type="text"
                    placeholder="Ex : Intelligence Artificielle"
                    value={specialty}
                    onChange={(e) =>
                      setSpecialty(e.target.value)
                    }
                    required
                  />
                </div>

              </div>

              <div className="form-field">
                <label htmlFor="internshipPeriod">
                  Période de stage
                </label>

                <input
                  id="internshipPeriod"
                  type="text"
                  placeholder="Ex : Juin - Août 2026"
                  value={internshipPeriod}
                  onChange={(e) =>
                    setInternshipPeriod(e.target.value)
                  }
                  required
                />

                <small>
                  Indique la période durant laquelle tu souhaites
                  effectuer ton stage.
                </small>
              </div>

              {message && (
                <div
                  className={`application-message ${typeMessage}`}
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                className="submit-application-button"
                disabled={envoi}
              >
                {envoi
                  ? 'Envoi de la candidature...'
                  : 'Envoyer ma candidature'}
              </button>

            </form>

          </section>
        )}

        {/* Message global */}
        {message &&
          candidatureExistante &&
          typeMessage === 'error' && (
            <div className="application-message error">
              {message}
            </div>
          )}

      </main>
    </div>
  )
}

export default Candidature