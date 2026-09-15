import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'

function Administration() {
  const [candidatures, setCandidatures] = useState([])
  const [recrutement, setRecrutement] = useState(null)

  const [onglet, setOnglet] = useState('dashboard')
  const [candidatureSelectionnee, setCandidatureSelectionnee] =
    useState(null)

  const [commentaires, setCommentaires] = useState([])
  const [nouveauCommentaire, setNouveauCommentaire] = useState('')

  const [loading, setLoading] = useState(true)
  const [chargementCommentaires, setChargementCommentaires] =
    useState(false)
  const [envoiCommentaire, setEnvoiCommentaire] = useState(false)

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

    // Vérifier que l'utilisateur est administrateur
    const { data: profil, error: profilError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profilError || profil?.role !== 'admin') {
      navigate('/connexion')
      return
    }

    // Récupérer les candidatures
    const { data: candidaturesData, error: candidaturesError } =
      await supabase
        .from('applications')
        .select(`
          *,
          profiles (
            id,
            full_name,
            school,
            specialty,
            role
          )
        `)
        .order('created_at', { ascending: false })

    if (candidaturesError) {
      setMessage(
        `Impossible de récupérer les candidatures : ${candidaturesError.message}`
      )
    } else {
      setCandidatures(candidaturesData || [])
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
        `Impossible de récupérer le recrutement : ${recrutementError.message}`
      )
    } else {
      setRecrutement(recrutementData)
    }

    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/connexion')
  }

  async function modifierStatut(applicationId, nouveauStatut) {
    setMessage('')

    const { error } = await supabase
      .from('applications')
      .update({
        status: nouveauStatut,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)

    if (error) {
      setMessage(
        `Impossible de modifier le statut : ${error.message}`
      )
      return
    }

    setCandidatures((anciennes) =>
      anciennes.map((candidature) =>
        candidature.id === applicationId
          ? {
              ...candidature,
              status: nouveauStatut,
            }
          : candidature
      )
    )

    if (candidatureSelectionnee?.id === applicationId) {
      setCandidatureSelectionnee((ancienne) => ({
        ...ancienne,
        status: nouveauStatut,
      }))
    }

    setMessage('Statut modifié avec succès.')
  }

  async function modifierRecrutement(champ, valeur) {
    setMessage('')

    if (champ === 'available_spots' && valeur < 0) {
      return
    }

    const { error } = await supabase
      .from('recruitment_settings')
      .update({
        [champ]: valeur,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)

    if (error) {
      setMessage(
        `Impossible de modifier le recrutement : ${error.message}`
      )
      return
    }

    setRecrutement((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }))

    setMessage('Modification enregistrée avec succès.')
  }

  async function ouvrirCandidature(candidature) {
    setCandidatureSelectionnee(candidature)
    setNouveauCommentaire('')
    setMessage('')
    setChargementCommentaires(true)

    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles (
          full_name,
          role
        )
      `)
      .eq('application_id', candidature.id)
      .order('created_at', { ascending: true })

    if (error) {
      setMessage(
        `Impossible de récupérer les commentaires : ${error.message}`
      )
      setCommentaires([])
    } else {
      setCommentaires(data || [])
    }

    setChargementCommentaires(false)
  }

  async function ajouterCommentaire(e) {
    e.preventDefault()

    if (!nouveauCommentaire.trim()) {
      setMessage('Le commentaire ne peut pas être vide.')
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage('Session administrateur introuvable.')
      return
    }

    if (!candidatureSelectionnee) {
      setMessage('Aucune candidature sélectionnée.')
      return
    }

    setEnvoiCommentaire(true)
    setMessage('')

    const { data, error } = await supabase
      .from('comments')
      .insert({
        application_id: candidatureSelectionnee.id,
        author_id: user.id,
        content: nouveauCommentaire.trim(),
      })
      .select(`
        *,
        profiles (
          full_name,
          role
        )
      `)
      .single()

    if (error) {
      setMessage(
        `Impossible d'ajouter le commentaire : ${error.message}`
      )
      setEnvoiCommentaire(false)
      return
    }

    setCommentaires((anciens) => [...anciens, data])
    setNouveauCommentaire('')
    setMessage('Commentaire ajouté avec succès.')
    setEnvoiCommentaire(false)
  }

  function fermerModal() {
    setCandidatureSelectionnee(null)
    setCommentaires([])
    setNouveauCommentaire('')
  }

  const traduireStatut = (statut) => {
    const statuts = {
      registration: 'Inscription',
      challenge: 'Challenge',
      interview: 'Entretien',
      admission: 'Admission',
      topic_definition: 'Définition du sujet',
    }

    return statuts[statut] || statut
  }

  const candidaturesParStatut = (statut) =>
    candidatures.filter(
      (candidature) => candidature.status === statut
    ).length

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Chargement de l'administration...</p>
      </div>
    )
  }

  return (
    <div className="admin-page">

      {/* =========================
          HEADER
          ========================= */}

      <header className="admin-header">
        <div className="admin-header-content">

          <div className="admin-brand">
            <div className="admin-logo">
              IP
            </div>

            <div>
              <h1>Internship Portal</h1>
              <span>Espace administration</span>
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

      <main className="admin-main">

        {/* =========================
            NAVIGATION
            ========================= */}

        <nav className="admin-nav">

          <button
            className={onglet === 'dashboard' ? 'active' : ''}
            onClick={() => setOnglet('dashboard')}
          >
            📊 Tableau de bord
          </button>

          <button
            className={onglet === 'candidatures' ? 'active' : ''}
            onClick={() => setOnglet('candidatures')}
          >
            📋 Candidatures
          </button>

          <button
            className={onglet === 'recrutement' ? 'active' : ''}
            onClick={() => setOnglet('recrutement')}
          >
            ⚙️ Recrutement
          </button>

        </nav>

        {/* =========================
            MESSAGE
            ========================= */}

        {message && (
          <div className="admin-message">
            {message}
          </div>
        )}

        {/* =========================
            TABLEAU DE BORD
            ========================= */}

        {onglet === 'dashboard' && (
          <>

            <div className="admin-welcome">
              <div>
                <span className="admin-label">
                  ADMINISTRATION
                </span>

                <h2>
                  Tableau de bord
                </h2>

                <p>
                  Suis l'activité des candidatures et
                  gère le recrutement.
                </p>
              </div>

              <div className="admin-welcome-icon">
                📊
              </div>
            </div>

            <div className="admin-stats">

              <div className="admin-stat-card">
                <div className="stat-icon">
                  👥
                </div>

                <span>
                  Candidatures
                </span>

                <strong>
                  {candidatures.length}
                </strong>
              </div>

              <div className="admin-stat-card">
                <div className="stat-icon">
                  📝
                </div>

                <span>
                  Inscriptions
                </span>

                <strong>
                  {candidaturesParStatut('registration')}
                </strong>
              </div>

              <div className="admin-stat-card">
                <div className="stat-icon">
                  🎯
                </div>

                <span>
                  Challenges
                </span>

                <strong>
                  {candidaturesParStatut('challenge')}
                </strong>
              </div>

              <div className="admin-stat-card">
                <div className="stat-icon">
                  🎓
                </div>

                <span>
                  Admis
                </span>

                <strong>
                  {candidaturesParStatut('admission')}
                </strong>
              </div>

            </div>

            <section className="admin-section">

              <div className="admin-section-header">
                <div>
                  <h2>
                    État du recrutement
                  </h2>

                  <p>
                    Situation actuelle du recrutement.
                  </p>
                </div>
              </div>

              {recrutement && (
                <div className="admin-recruitment-summary">

                  <div className="recruitment-status-box">

                    <span>
                      État
                    </span>

                    <strong
                      className={
                        recrutement.is_active
                          ? 'recruitment-open'
                          : 'recruitment-closed'
                      }
                    >
                      {recrutement.is_active
                        ? '🟢 Ouvert'
                        : '🔴 Fermé'}
                    </strong>

                  </div>

                  <div className="recruitment-status-box">

                    <span>
                      Places disponibles
                    </span>

                    <strong>
                      {recrutement.available_spots}
                    </strong>

                  </div>

                </div>
              )}

            </section>

          </>
        )}

        {/* =========================
            CANDIDATURES
            ========================= */}

        {onglet === 'candidatures' && (
          <section className="admin-section">

            <div className="admin-section-header">

              <div>
                <h2>
                  Candidatures
                </h2>

                <p>
                  Consulte et gère les dossiers des candidats.
                </p>
              </div>

              <span className="admin-count">
                {candidatures.length} candidature
                {candidatures.length > 1 ? 's' : ''}
              </span>

            </div>

            {candidatures.length === 0 ? (

              <div className="admin-empty">
                <div>
                  📋
                </div>

                <h3>
                  Aucune candidature
                </h3>

                <p>
                  Les candidatures des utilisateurs
                  apparaîtront ici.
                </p>
              </div>

            ) : (

              <div className="admin-table-wrapper">

                <table className="admin-table">

                  <thead>
                    <tr>
                      <th>Candidat</th>
                      <th>École</th>
                      <th>Spécialité</th>
                      <th>Période</th>
                      <th>Statut</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>

                    {candidatures.map((candidature) => (

                      <tr key={candidature.id}>

                        <td>
                          <strong>
                            {candidature.profiles?.full_name ||
                              'Candidat'}
                          </strong>
                        </td>

                        <td>
                          {candidature.profiles?.school ||
                            'Non renseignée'}
                        </td>

                        <td>
                          {candidature.profiles?.specialty ||
                            'Non renseignée'}
                        </td>

                        <td>
                          {candidature.internship_period ||
                            'Non renseignée'}
                        </td>

                        <td>
                          <span className="admin-status">
                            {traduireStatut(
                              candidature.status
                            )}
                          </span>
                        </td>

                        <td>
                          <button
                            className="admin-action-button"
                            onClick={() =>
                              ouvrirCandidature(
                                candidature
                              )
                            }
                          >
                            Voir le dossier
                          </button>
                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            )}

          </section>
        )}

        {/* =========================
            RECRUTEMENT
            ========================= */}

        {onglet === 'recrutement' && (
          <section className="admin-section">

            <div className="admin-section-header">

              <div>
                <h2>
                  Gestion du recrutement
                </h2>

                <p>
                  Contrôle l'ouverture des candidatures
                  et le nombre de places.
                </p>
              </div>

            </div>

            {recrutement && (

              <div className="recruitment-card">

                {/* Ouverture / fermeture */}

                <div className="recruitment-control">

                  <h3>
                    État du recrutement
                  </h3>

                  <p>
                    Active ou ferme les candidatures.
                  </p>

                  <div className="recruitment-toggle">

                    <strong
                      className={
                        recrutement.is_active
                          ? 'recruitment-open'
                          : 'recruitment-closed'
                      }
                    >
                      {recrutement.is_active
                        ? '🟢 Recrutement ouvert'
                        : '🔴 Recrutement fermé'}
                    </strong>

                    <button
                      onClick={() =>
                        modifierRecrutement(
                          'is_active',
                          !recrutement.is_active
                        )
                      }
                    >
                      {recrutement.is_active
                        ? 'Fermer'
                        : 'Ouvrir'}
                    </button>

                  </div>

                </div>

                {/* Places */}

                <div className="recruitment-control">

                  <h3>
                    Places disponibles
                  </h3>

                  <p>
                    Défini le nombre de places encore
                    disponibles.
                  </p>

                  <div className="recruitment-number">

                    <button
                      onClick={() =>
                        modifierRecrutement(
                          'available_spots',
                          Math.max(
                            0,
                            recrutement.available_spots - 1
                          )
                        )
                      }
                    >
                      −
                    </button>

                    <strong>
                      {recrutement.available_spots}
                    </strong>

                    <button
                      onClick={() =>
                        modifierRecrutement(
                          'available_spots',
                          recrutement.available_spots + 1
                        )
                      }
                    >
                      +
                    </button>

                  </div>

                </div>

              </div>

            )}

          </section>
        )}

      </main>

      {/* =========================
          MODAL CANDIDATURE
          ========================= */}

      {candidatureSelectionnee && (

        <div
          className="admin-modal-overlay"
          onClick={fermerModal}
        >

          <div
            className="admin-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="admin-modal-header">

              <div>
                <span className="admin-label">
                  DOSSIER CANDIDAT
                </span>

                <h2>
                  {candidatureSelectionnee.profiles?.full_name ||
                    'Candidat'}
                </h2>
              </div>

              <button
                className="admin-close-button"
                onClick={fermerModal}
              >
                ✕
              </button>

            </div>

            {/* Informations */}

            <div className="candidate-detail-grid">

              <div>
                <span>
                  École
                </span>

                <strong>
                  {candidatureSelectionnee.profiles?.school ||
                    'Non renseignée'}
                </strong>
              </div>

              <div>
                <span>
                  Spécialité
                </span>

                <strong>
                  {candidatureSelectionnee.profiles?.specialty ||
                    'Non renseignée'}
                </strong>
              </div>

              <div>
                <span>
                  Période de stage
                </span>

                <strong>
                  {candidatureSelectionnee.internship_period ||
                    'Non renseignée'}
                </strong>
              </div>

              <div>
                <span>
                  Date de candidature
                </span>

                <strong>
                  {new Date(
                    candidatureSelectionnee.created_at
                  ).toLocaleDateString('fr-FR')}
                </strong>
              </div>

            </div>

            {/* Statut */}

            <div className="candidate-status-section">

              <label htmlFor="candidate-status">
                Modifier le statut
              </label>

              <select
                id="candidate-status"
                value={candidatureSelectionnee.status}
                onChange={(e) =>
                  modifierStatut(
                    candidatureSelectionnee.id,
                    e.target.value
                  )
                }
              >

                <option value="registration">
                  Inscription
                </option>

                <option value="challenge">
                  Challenge
                </option>

                <option value="interview">
                  Entretien
                </option>

                <option value="admission">
                  Admission
                </option>

                <option value="topic_definition">
                  Définition du sujet
                </option>

              </select>

            </div>

            {/* Commentaires */}

            <div className="admin-comments-section">

              <div className="comments-section-title">
                <h3>
                  💬 Commentaires
                </h3>

                <p>
                  Les commentaires sont visibles
                  par le candidat.
                </p>
              </div>

              {chargementCommentaires ? (

                <p>
                  Chargement des commentaires...
                </p>

              ) : commentaires.length === 0 ? (

                <div className="admin-no-comments">
                  Aucun commentaire pour le moment.
                </div>

              ) : (

                <div className="admin-comments-list">

                  {commentaires.map((commentaire) => (

                    <div
                      className="admin-comment"
                      key={commentaire.id}
                    >

                      <strong>
                        {commentaire.profiles?.full_name ||
                          'Administration'}
                      </strong>

                      <small>
                        {new Date(
                          commentaire.created_at
                        ).toLocaleString('fr-FR')}
                      </small>

                      <p>
                        {commentaire.content}
                      </p>

                    </div>

                  ))}

                </div>

              )}

              <form
                className="admin-comment-form"
                onSubmit={ajouterCommentaire}
              >

                <label htmlFor="new-comment">
                  Ajouter un commentaire
                </label>

                <textarea
                  id="new-comment"
                  placeholder="Écris un commentaire pour le candidat..."
                  value={nouveauCommentaire}
                  onChange={(e) =>
                    setNouveauCommentaire(e.target.value)
                  }
                />

                <button
                  type="submit"
                  disabled={envoiCommentaire}
                >
                  {envoiCommentaire
                    ? 'Envoi...'
                    : 'Ajouter le commentaire'}
                </button>

              </form>

            </div>

          </div>

        </div>

      )}

    </div>
  )
}

export default Administration