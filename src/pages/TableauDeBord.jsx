import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'

function TableauDeBord() {
  const [profil, setProfil] = useState(null)
  const [candidature, setCandidature] = useState(null)
  const [commentaires, setCommentaires] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

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

    // Récupérer le profil du candidat
    const { data: profilData, error: profilError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profilError) {
      setMessage('Impossible de récupérer ton profil.')
      setLoading(false)
      return
    }

    setProfil(profilData)

    // Récupérer la candidature
    const { data: candidatureData, error: candidatureError } =
      await supabase
        .from('applications')
        .select('*')
        .eq('candidate_id', user.id)
        .maybeSingle()

    if (candidatureError) {
      setMessage('Impossible de récupérer ta candidature.')
      setLoading(false)
      return
    }

    setCandidature(candidatureData)

    // Récupérer les commentaires de l'administration
    if (candidatureData) {
      const { data: commentairesData, error: commentairesError } =
        await supabase
          .from('comments')
          .select(`
            *,
            profiles (
              full_name,
              role
            )
          `)
          .eq('application_id', candidatureData.id)
          .order('created_at', { ascending: true })

      if (commentairesError) {
        setMessage(
          `Impossible de récupérer les commentaires : ${commentairesError.message}`
        )
      } else {
        setCommentaires(commentairesData || [])
      }
    }

    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/connexion')
  }

  const etapes = [
    {
      nom: 'Inscription',
      statut: 'registration',
    },
    {
      nom: 'Challenge',
      statut: 'challenge',
    },
    {
      nom: 'Entretien',
      statut: 'interview',
    },
    {
      nom: 'Admission',
      statut: 'admission',
    },
    {
      nom: 'Définition du sujet',
      statut: 'topic_definition',
    },
  ]

  const indexEtapeActuelle = etapes.findIndex(
    (etape) => etape.statut === candidature?.status
  )

  const pourcentage =
    indexEtapeActuelle >= 0
      ? ((indexEtapeActuelle + 1) / etapes.length) * 100
      : 0

  const nomsStatuts = {
    registration: 'Inscription',
    challenge: 'Challenge',
    interview: 'Entretien',
    admission: 'Admission',
    topic_definition: 'Définition du sujet',
  }

  const statutActuel =
    nomsStatuts[candidature?.status] || 'Non défini'

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Chargement de ton espace...</p>
      </div>
    )
  }

  return (
    <div className="dashboard-page">

      {/* =========================
          EN-TÊTE
          ========================= */}
      <header className="dashboard-header">
        <div className="dashboard-header-content">
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
            className="logout-button"
            onClick={handleLogout}
          >
            Se déconnecter
          </button>
        </div>
      </header>

      <main className="dashboard-main">

        {/* =========================
            BIENVENUE
            ========================= */}
        <section className="welcome-card">
          <div>
            <p className="welcome-label">
              MON ESPACE
            </p>

            <h2>
              Bonjour {profil?.full_name || 'Candidat'} 👋
            </h2>

            <p>
              Bienvenue dans ton espace candidat.
              Tu peux suivre ici l'évolution de ta candidature.
            </p>
          </div>

          <div className="welcome-icon">
            👤
          </div>
        </section>

        {/* =========================
            INFORMATIONS
            ========================= */}
        <section className="dashboard-section">
          <div className="section-title">
            <div>
              <span className="section-icon">📋</span>
              <div>
                <h2>Mes informations</h2>
                <p>Les informations liées à ton profil</p>
              </div>
            </div>
          </div>

          <div className="info-grid">

            <div className="info-card">
              <span className="info-label">
                Nom complet
              </span>

              <strong>
                {profil?.full_name || 'Non renseigné'}
              </strong>
            </div>

            <div className="info-card">
              <span className="info-label">
                École
              </span>

              <strong>
                {profil?.school || 'Non renseignée'}
              </strong>
            </div>

            <div className="info-card">
              <span className="info-label">
                Spécialité
              </span>

              <strong>
                {profil?.specialty || 'Non renseignée'}
              </strong>
            </div>

            <div className="info-card">
              <span className="info-label">
                Période de stage
              </span>

              <strong>
                {candidature?.internship_period ||
                  'Non renseignée'}
              </strong>
            </div>

          </div>
        </section>

        {/* =========================
            CANDIDATURE
            ========================= */}
        <section className="dashboard-section">
          <div className="section-title">
            <div>
              <span className="section-icon">🚀</span>

              <div>
                <h2>Ma candidature</h2>

                <p>
                  Suis l'évolution de ton parcours
                </p>
              </div>
            </div>
          </div>

          {!candidature ? (
            <div className="empty-application">

              <div className="empty-icon">
                📝
              </div>

              <h3>
                Tu n'as pas encore envoyé ta candidature
              </h3>

              <p>
                Complète ton dossier pour commencer
                ton parcours de recrutement.
              </p>

              <button
                className="primary-button"
                onClick={() => navigate('/candidature')}
              >
                Compléter ma candidature
              </button>

            </div>
          ) : (
            <div>

              {/* Statut actuel */}
              <div className="current-status">

                <div>
                  <span className="status-label">
                    STATUT ACTUEL
                  </span>

                  <h3>
                    {statutActuel}
                  </h3>
                </div>

                <span className="status-badge">
                  {statutActuel}
                </span>

              </div>

              {/* Barre de progression */}
              <div className="progress-container">

                <div className="progress-header">
                  <span>
                    Progression du parcours
                  </span>

                  <strong>
                    {Math.round(pourcentage)}%
                  </strong>
                </div>

                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${pourcentage}%`,
                    }}
                  ></div>
                </div>

              </div>

              {/* Étapes */}
              <div className="steps-container">

                {etapes.map((etape, index) => {

                  const terminee =
                    index <= indexEtapeActuelle

                  const actuelle =
                    index === indexEtapeActuelle

                  return (
                    <div
                      className={`step ${
                        terminee ? 'completed' : ''
                      } ${
                        actuelle ? 'current' : ''
                      }`}
                      key={etape.statut}
                    >

                      <div className="step-circle">
                        {terminee ? '✓' : index + 1}
                      </div>

                      <div className="step-content">

                        <strong>
                          {etape.nom}
                        </strong>

                        {actuelle && (
                          <span>
                            Étape actuelle
                          </span>
                        )}

                        {!actuelle &&
                          terminee && (
                            <span>
                              Terminée
                            </span>
                          )}

                        {!terminee && (
                          <span>
                            À venir
                          </span>
                        )}

                      </div>

                    </div>
                  )
                })}

              </div>

            </div>
          )}
        </section>

        {/* =========================
            COMMENTAIRES
            ========================= */}
        {candidature && (
          <section className="dashboard-section">

            <div className="section-title">
              <div>
                <span className="section-icon">
                  💬
                </span>

                <div>
                  <h2>
                    Commentaires de l'administration
                  </h2>

                  <p>
                    Les messages concernant ta candidature
                  </p>
                </div>
              </div>
            </div>

            {commentaires.length === 0 ? (
              <div className="no-comments">

                <div className="no-comments-icon">
                  💬
                </div>

                <p>
                  Aucun commentaire pour le moment.
                </p>

                <small>
                  L'administration pourra laisser
                  un commentaire ici.
                </small>

              </div>
            ) : (
              <div className="comments-list">

                {commentaires.map((commentaire) => (
                  <div
                    className="comment-card"
                    key={commentaire.id}
                  >

                    <div className="comment-header">

                      <div className="comment-author">

                        <div className="comment-avatar">
                          {(commentaire.profiles?.full_name ||
                            'A')[0].toUpperCase()}
                        </div>

                        <div>
                          <strong>
                            {commentaire.profiles?.full_name ||
                              'Administration'}
                          </strong>

                          <span>
                            Administration
                          </span>
                        </div>

                      </div>

                      <small>
                        {new Date(
                          commentaire.created_at
                        ).toLocaleString('fr-FR')}
                      </small>

                    </div>

                    <p className="comment-content">
                      {commentaire.content}
                    </p>

                  </div>
                ))}

              </div>
            )}

          </section>
        )}

        {/* =========================
            MESSAGE
            ========================= */}
        {message && (
          <div className="dashboard-message">
            {message}
          </div>
        )}

      </main>
    </div>
  )
}

export default TableauDeBord