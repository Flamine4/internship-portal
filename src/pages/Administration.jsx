import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'

function Administration() {
  const [onglet, setOnglet] = useState('tableau')
  const [candidatures, setCandidatures] = useState([])
  const [recrutement, setRecrutement] = useState(null)
  const [candidatureSelectionnee, setCandidatureSelectionnee] =
    useState(null)
  const [commentaires, setCommentaires] = useState([])
  const [nouveauCommentaire, setNouveauCommentaire] = useState('')
  const [chargementCommentaires, setChargementCommentaires] =
    useState(false)
  const [envoiCommentaire, setEnvoiCommentaire] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const navigate = useNavigate()

  useEffect(() => {
    verifierAdmin()
  }, [])

  async function verifierAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      navigate('/connexion')
      return
    }

    const { data: profil, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (error || profil?.role !== 'admin') {
      setMessage(
        "Accès refusé. Cette page est réservée à l'administrateur."
      )
      setLoading(false)
      return
    }

    await chargerDonnees()
  }

  async function chargerDonnees() {
    setLoading(true)

    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        profiles (
          full_name,
          school,
          specialty
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(
        `Impossible de récupérer les candidatures : ${error.message}`
      )
      setLoading(false)
      return
    }

    setCandidatures(data || [])

    const { data: settings, error: settingsError } = await supabase
      .from('recruitment_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    if (settingsError) {
      setMessage(
        `Impossible de récupérer les paramètres : ${settingsError.message}`
      )
    }

    setRecrutement(settings)
    setLoading(false)
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
      setMessage(`Erreur : ${error.message}`)
      return
    }

    setMessage('Statut modifié avec succès.')
    await chargerDonnees()
  }

  async function modifierRecrutement(champ, valeur) {
    setMessage('')

    const { error } = await supabase
      .from('recruitment_settings')
      .update({
        [champ]: valeur,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)

    if (error) {
      setMessage(`Erreur : ${error.message}`)
      return
    }

    setRecrutement((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }))

    setMessage('Modification enregistrée avec succès.')
  }

  /* =====================================================
     COMMENTAIRES
  ===================================================== */

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
      setChargementCommentaires(false)
      return
    }

    setCommentaires(data || [])
    setChargementCommentaires(false)
  }

  function fermerCandidature() {
    setCandidatureSelectionnee(null)
    setCommentaires([])
    setNouveauCommentaire('')
    setMessage('')
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

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/connexion')
  }

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.loadingCard}>
          <div style={styles.spinner}></div>
          <p>Chargement de l'administration...</p>
        </div>
      </div>
    )
  }

  if (message.includes('Accès refusé')) {
    return (
      <div style={styles.accessPage}>
        <div style={styles.accessCard}>
          <div style={styles.accessIcon}>🔒</div>

          <h1>Accès refusé</h1>

          <p>{message}</p>

          <button
            onClick={() => navigate('/dashboard')}
            style={styles.backButton}
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      {/* ================= HEADER ================= */}

      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>IP</div>

          <div>
            <h1 style={styles.title}>Administration</h1>

            <p style={styles.subtitle}>
              Gestion du portail des stages
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={styles.logoutButton}
        >
          <span>↪</span>
          Se déconnecter
        </button>
      </header>

      {/* ================= NAVIGATION ================= */}

      <nav style={styles.navigation}>
        <div style={styles.navInner}>
          <button
            onClick={() => setOnglet('tableau')}
            style={{
              ...styles.navButton,
              ...(onglet === 'tableau'
                ? styles.navButtonActive
                : {}),
            }}
          >
            <span style={styles.navIcon}>📊</span>
            <span>Tableau de bord</span>
          </button>

          <button
            onClick={() => setOnglet('candidatures')}
            style={{
              ...styles.navButton,
              ...(onglet === 'candidatures'
                ? styles.navButtonActive
                : {}),
            }}
          >
            <span style={styles.navIcon}>📋</span>

            <span>Candidatures</span>

            <span style={styles.badge}>
              {candidatures.length}
            </span>
          </button>

          <button
            onClick={() => setOnglet('recrutement')}
            style={{
              ...styles.navButton,
              ...(onglet === 'recrutement'
                ? styles.navButtonActive
                : {}),
            }}
          >
            <span style={styles.navIcon}>⚙️</span>
            <span>Recrutement</span>
          </button>
        </div>
      </nav>

      {/* ================= CONTENU ================= */}

      <main style={styles.main}>
        {message && (
          <div style={styles.message}>
            <span>✓</span>
            {message}
          </div>
        )}

        {/* =====================================================
            TABLEAU DE BORD
        ===================================================== */}

        {onglet === 'tableau' && (
          <section>
            <div style={styles.pageHeading}>
              <div>
                <p style={styles.eyebrow}>
                  VUE D'ENSEMBLE
                </p>

                <h2 style={styles.heading}>
                  Tableau de bord
                </h2>

                <p style={styles.headingDescription}>
                  Voici un aperçu de l'activité du portail.
                </p>
              </div>

              <div style={styles.statusPill}>
                <span
                  style={{
                    ...styles.statusDot,
                    backgroundColor: recrutement?.is_active
                      ? '#22c55e'
                      : '#ef4444',
                  }}
                ></span>

                Recrutement{' '}
                {recrutement?.is_active
                  ? 'ouvert'
                  : 'fermé'}
              </div>
            </div>

            <div style={styles.cards}>
              <div style={styles.card}>
                <div
                  style={{
                    ...styles.cardIcon,
                    backgroundColor: '#dbeafe',
                  }}
                >
                  👥
                </div>

                <div>
                  <p style={styles.cardLabel}>
                    CANDIDATURES
                  </p>

                  <strong style={styles.cardNumber}>
                    {candidatures.length}
                  </strong>

                  <p style={styles.cardDescription}>
                    Dossiers reçus
                  </p>
                </div>
              </div>

              <div style={styles.card}>
                <div
                  style={{
                    ...styles.cardIcon,
                    backgroundColor: '#dcfce7',
                  }}
                >
                  📍
                </div>

                <div>
                  <p style={styles.cardLabel}>
                    PLACES DISPONIBLES
                  </p>

                  <strong style={styles.cardNumber}>
                    {recrutement?.available_spots ?? 0}
                  </strong>

                  <p style={styles.cardDescription}>
                    Places restantes
                  </p>
                </div>
              </div>

              <div style={styles.card}>
                <div
                  style={{
                    ...styles.cardIcon,
                    backgroundColor: recrutement?.is_active
                      ? '#dcfce7'
                      : '#fee2e2',
                  }}
                >
                  {recrutement?.is_active
                    ? '🟢'
                    : '🔴'}
                </div>

                <div>
                  <p style={styles.cardLabel}>
                    RECRUTEMENT
                  </p>

                  <strong style={styles.cardStatus}>
                    {recrutement?.is_active
                      ? 'Ouvert'
                      : 'Fermé'}
                  </strong>

                  <p style={styles.cardDescription}>
                    État actuel
                  </p>
                </div>
              </div>
            </div>

            <div style={styles.welcomeBox}>
              <div style={styles.welcomeIcon}>
                ✨
              </div>

              <div>
                <h3 style={styles.welcomeTitle}>
                  Bienvenue dans l'espace administrateur
                </h3>

                <p style={styles.welcomeText}>
                  Depuis cette interface, tu peux suivre
                  les candidatures, modifier leur
                  progression, ajouter des commentaires et
                  contrôler l'ouverture du recrutement.
                </p>
              </div>
            </div>

            <div style={styles.quickSection}>
              <h3 style={styles.sectionTitle}>
                Actions rapides
              </h3>

              <div style={styles.quickGrid}>
                <button
                  onClick={() =>
                    setOnglet('candidatures')
                  }
                  style={styles.quickCard}
                >
                  <span style={styles.quickIcon}>
                    📋
                  </span>

                  <div>
                    <strong>
                      Voir les candidatures
                    </strong>

                    <p>
                      Consulter les dossiers et ajouter
                      des commentaires
                    </p>
                  </div>

                  <span style={styles.arrow}>→</span>
                </button>

                <button
                  onClick={() =>
                    setOnglet('recrutement')
                  }
                  style={styles.quickCard}
                >
                  <span style={styles.quickIcon}>
                    ⚙️
                  </span>

                  <div>
                    <strong>
                      Gérer le recrutement
                    </strong>

                    <p>
                      Modifier les places et l'état
                    </p>
                  </div>

                  <span style={styles.arrow}>→</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* =====================================================
            CANDIDATURES
        ===================================================== */}

        {onglet === 'candidatures' && (
          <section>
            <div style={styles.pageHeading}>
              <div>
                <p style={styles.eyebrow}>
                  GESTION DES DOSSIERS
                </p>

                <h2 style={styles.heading}>
                  Candidatures
                </h2>

                <p style={styles.headingDescription}>
                  Consulte les candidats, fais évoluer leur
                  statut et ajoute des commentaires.
                </p>
              </div>

              <div style={styles.countBox}>
                <strong>
                  {candidatures.length}
                </strong>

                <span>
                  candidature
                  {candidatures.length !== 1
                    ? 's'
                    : ''}
                </span>
              </div>
            </div>

            {candidatures.length === 0 ? (
              <div style={styles.empty}>
                <div style={styles.emptyIcon}>
                  📭
                </div>

                <h3 style={styles.emptyTitle}>
                  Aucune candidature
                </h3>

                <p style={styles.emptyText}>
                  Les candidatures apparaîtront ici dès
                  qu'un candidat enverra son dossier.
                </p>
              </div>
            ) : (
              <div style={styles.tableCard}>
                <div style={styles.tableTop}>
                  <div>
                    <h3 style={styles.tableTitle}>
                      Liste des candidats
                    </h3>

                    <p style={styles.tableDescription}>
                      {candidatures.length} dossier
                      {candidatures.length !== 1
                        ? 's'
                        : ''}{' '}
                      enregistré
                      {candidatures.length !== 1
                        ? 's'
                        : ''}
                    </p>
                  </div>
                </div>

                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>
                          Candidat
                        </th>

                        <th style={styles.th}>
                          École
                        </th>

                        <th style={styles.th}>
                          Spécialité
                        </th>

                        <th style={styles.th}>
                          Période
                        </th>

                        <th style={styles.th}>
                          Statut
                        </th>

                        <th style={styles.th}>
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {candidatures.map(
                        (candidature) => (
                          <tr
                            key={candidature.id}
                            style={styles.tr}
                          >
                            <td style={styles.td}>
                              <div
                                style={
                                  styles.candidateCell
                                }
                              >
                                <div
                                  style={
                                    styles.avatar
                                  }
                                >
                                  {candidature.profiles?.full_name
                                    ?.charAt(0)
                                    ?.toUpperCase() ||
                                    '?'}
                                </div>

                                <div>
                                  <strong
                                    style={
                                      styles.candidateName
                                    }
                                  >
                                    {candidature
                                      .profiles
                                      ?.full_name ||
                                      'Nom inconnu'}
                                  </strong>

                                  <span
                                    style={
                                      styles.candidateId
                                    }
                                  >
                                    Candidat
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td style={styles.td}>
                              {candidature.profiles
                                ?.school ||
                                'Non renseignée'}
                            </td>

                            <td style={styles.td}>
                              {candidature.profiles
                                ?.specialty ||
                                'Non renseignée'}
                            </td>

                            <td style={styles.td}>
                              <span
                                style={
                                  styles.period
                                }
                              >
                                📅{' '}
                                {
                                  candidature.internship_period
                                }
                              </span>
                            </td>

                            <td style={styles.td}>
                              <select
                                value={
                                  candidature.status
                                }
                                onChange={(e) =>
                                  modifierStatut(
                                    candidature.id,
                                    e.target.value
                                  )
                                }
                                style={
                                  styles.statusSelect
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
                            </td>

                            <td style={styles.td}>
                              <button
                                onClick={() =>
                                  ouvrirCandidature(
                                    candidature
                                  )
                                }
                                style={styles.viewButton}
                              >
                                👁️ Voir
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {/* =====================================================
            RECRUTEMENT
        ===================================================== */}

        {onglet === 'recrutement' && (
          <section>
            <div style={styles.pageHeading}>
              <div>
                <p style={styles.eyebrow}>
                  PARAMÈTRES
                </p>

                <h2 style={styles.heading}>
                  Gestion du recrutement
                </h2>

                <p style={styles.headingDescription}>
                  Contrôle l'ouverture du recrutement et
                  le nombre de places disponibles.
                </p>
              </div>
            </div>

            <div style={styles.recruitmentGrid}>
              <div style={styles.recruitmentCard}>
                <div style={styles.recruitmentHeader}>
                  <div
                    style={{
                      ...styles.recruitmentIcon,
                      backgroundColor:
                        recrutement?.is_active
                          ? '#dcfce7'
                          : '#fee2e2',
                    }}
                  >
                    {recrutement?.is_active
                      ? '🟢'
                      : '🔴'}
                  </div>

                  <div>
                    <h3
                      style={
                        styles.recruitmentTitle
                      }
                    >
                      État du recrutement
                    </h3>

                    <p
                      style={
                        styles.recruitmentDescription
                      }
                    >
                      Active ou désactive les candidatures.
                    </p>
                  </div>
                </div>

                <div style={styles.divider}></div>

                <div style={styles.settingRow}>
                  <div>
                    <span
                      style={styles.currentLabel}
                    >
                      État actuel
                    </span>

                    <strong
                      style={{
                        ...styles.currentValue,
                        color: recrutement?.is_active
                          ? '#16a34a'
                          : '#dc2626',
                      }}
                    >
                      {recrutement?.is_active
                        ? 'Recrutement ouvert'
                        : 'Recrutement fermé'}
                    </strong>
                  </div>

                  <button
                    onClick={() =>
                      modifierRecrutement(
                        'is_active',
                        !recrutement?.is_active
                      )
                    }
                    style={{
                      ...styles.toggleButton,
                      backgroundColor:
                        recrutement?.is_active
                          ? '#dc2626'
                          : '#16a34a',
                    }}
                  >
                    {recrutement?.is_active
                      ? 'Fermer'
                      : 'Ouvrir'}
                  </button>
                </div>
              </div>

              <div style={styles.recruitmentCard}>
                <div style={styles.recruitmentHeader}>
                  <div
                    style={{
                      ...styles.recruitmentIcon,
                      backgroundColor: '#dbeafe',
                    }}
                  >
                    📍
                  </div>

                  <div>
                    <h3
                      style={
                        styles.recruitmentTitle
                      }
                    >
                      Places disponibles
                    </h3>

                    <p
                      style={
                        styles.recruitmentDescription
                      }
                    >
                      Définis le nombre de places restantes.
                    </p>
                  </div>
                </div>

                <div style={styles.divider}></div>

                <div style={styles.spotsContent}>
                  <div>
                    <span
                      style={styles.currentLabel}
                    >
                      Nombre de places
                    </span>

                    <strong
                      style={styles.bigNumber}
                    >
                      {recrutement?.available_spots ??
                        0}
                    </strong>
                  </div>

                  <div style={styles.counter}>
                    <button
                      onClick={() =>
                        modifierRecrutement(
                          'available_spots',
                          Math.max(
                            0,
                            (recrutement?.available_spots ??
                              0) - 1
                          )
                        )
                      }
                      style={styles.counterButton}
                    >
                      −
                    </button>

                    <div style={styles.counterValue}>
                      {recrutement?.available_spots ??
                        0}
                    </div>

                    <button
                      onClick={() =>
                        modifierRecrutement(
                          'available_spots',
                          (recrutement?.available_spots ??
                            0) + 1
                        )
                      }
                      style={styles.counterButton}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.warningBox}>
              <span style={styles.warningIcon}>
                💡
              </span>

              <div>
                <strong>Information</strong>

                <p>
                  Lorsque le recrutement est fermé, les
                  candidats ne devraient plus pouvoir
                  envoyer de nouvelles candidatures.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* =====================================================
          MODALE : DÉTAILS + COMMENTAIRES
      ===================================================== */}

      {candidatureSelectionnee && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <p style={styles.modalEyebrow}>
                  DOSSIER CANDIDAT
                </p>

                <h2 style={styles.modalTitle}>
                  {candidatureSelectionnee.profiles
                    ?.full_name || 'Nom inconnu'}
                </h2>
              </div>

              <button
                onClick={fermerCandidature}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>

            {/* Informations candidat */}
            <div style={styles.detailsGrid}>
              <div style={styles.detailItem}>
                <span>École</span>

                <strong>
                  {candidatureSelectionnee.profiles
                    ?.school || 'Non renseignée'}
                </strong>
              </div>

              <div style={styles.detailItem}>
                <span>Spécialité</span>

                <strong>
                  {candidatureSelectionnee.profiles
                    ?.specialty || 'Non renseignée'}
                </strong>
              </div>

              <div style={styles.detailItem}>
                <span>Période</span>

                <strong>
                  {
                    candidatureSelectionnee.internship_period
                  }
                </strong>
              </div>

              <div style={styles.detailItem}>
                <span>Statut</span>

                <strong style={styles.detailStatus}>
                  {traduireStatut(
                    candidatureSelectionnee.status
                  )}
                </strong>
              </div>
            </div>

            <div style={styles.modalDivider}></div>

            {/* Commentaires */}
            <div>
              <div style={styles.commentsHeader}>
                <div>
                  <h3 style={styles.commentsTitle}>
                    Commentaires
                  </h3>

                  <p style={styles.commentsDescription}>
                    Notes et remarques concernant cette
                    candidature.
                  </p>
                </div>

                <span style={styles.commentsCount}>
                  {commentaires.length}
                </span>
              </div>

              {chargementCommentaires ? (
                <div style={styles.commentsLoading}>
                  Chargement des commentaires...
                </div>
              ) : commentaires.length === 0 ? (
                <div style={styles.noComments}>
                  <span>💬</span>

                  <p>
                    Aucun commentaire pour le moment.
                  </p>
                </div>
              ) : (
                <div style={styles.commentsList}>
                  {commentaires.map((commentaire) => (
                    <div
                      key={commentaire.id}
                      style={styles.comment}
                    >
                      <div style={styles.commentTop}>
                        <div
                          style={
                            styles.commentAuthor
                          }
                        >
                          <div
                            style={
                              styles.commentAvatar
                            }
                          >
                            {commentaire.profiles
                              ?.full_name
                              ?.charAt(0)
                              ?.toUpperCase() ||
                              'A'}
                          </div>

                          <strong>
                            {commentaire.profiles
                              ?.full_name ||
                              'Administrateur'}
                          </strong>
                        </div>

                        <span
                          style={
                            styles.commentDate
                          }
                        >
                          {formaterDate(
                            commentaire.created_at
                          )}
                        </span>
                      </div>

                      <p style={styles.commentText}>
                        {commentaire.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Ajouter commentaire */}
              <form
                onSubmit={ajouterCommentaire}
                style={styles.commentForm}
              >
                <label style={styles.commentLabel}>
                  Ajouter un commentaire
                </label>

                <textarea
                  value={nouveauCommentaire}
                  onChange={(e) =>
                    setNouveauCommentaire(
                      e.target.value
                    )
                  }
                  placeholder="Écrire une note concernant cette candidature..."
                  rows="4"
                  style={styles.textarea}
                />

                <div style={styles.commentFormBottom}>
                  <span style={styles.commentHint}>
                    Le candidat pourra voir ce commentaire.
                  </span>

                  <button
                    type="submit"
                    disabled={envoiCommentaire}
                    style={styles.commentButton}
                  >
                    {envoiCommentaire
                      ? 'Enregistrement...'
                      : 'Ajouter le commentaire'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================= FOOTER ================= */}

      <footer style={styles.footer}>
        <p>Portail de gestion des stages</p>

        <span>Administration</span>
      </footer>
    </div>
  )
}

/* =====================================================
   FONCTIONS UTILITAIRES
===================================================== */

function traduireStatut(statut) {
  const statuts = {
    registration: 'Inscription',
    challenge: 'Challenge',
    interview: 'Entretien',
    admission: 'Admission',
    topic_definition: 'Définition du sujet',
  }

  return statuts[statut] || statut
}

function formaterDate(date) {
  if (!date) return ''

  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/* =====================================================
   STYLES
===================================================== */

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#eef2f7',
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    color: '#172033',
  },

  header: {
    minHeight: '82px',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    padding: '0 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxSizing: 'border-box',
  },

  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },

  logo: {
    width: '46px',
    height: '46px',
    borderRadius: '12px',
    backgroundColor: '#2563eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '15px',
    boxShadow:
      '0 4px 12px rgba(37, 99, 235, 0.35)',
  },

  title: {
    margin: 0,
    fontSize: '23px',
    fontWeight: '700',
  },

  subtitle: {
    margin: '4px 0 0',
    color: '#94a3b8',
    fontSize: '13px',
  },

  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    border: '1px solid #334155',
    borderRadius: '9px',
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    cursor: 'pointer',
    fontSize: '14px',
  },

  navigation: {
    backgroundColor: '#172033',
    borderTop: '1px solid #253047',
    borderBottom: '1px solid #263247',
    padding: '10px 40px',
  },

  navInner: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    gap: '8px',
  },

  navButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
    padding: '12px 18px',
    border: '1px solid transparent',
    borderRadius: '9px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },

  navButtonActive: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontWeight: '700',
    boxShadow:
      '0 4px 12px rgba(37, 99, 235, 0.3)',
  },

  navIcon: {
    fontSize: '16px',
  },

  badge: {
    minWidth: '21px',
    height: '21px',
    padding: '0 6px',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '20px',
    backgroundColor: '#ffffff',
    color: '#2563eb',
    fontSize: '11px',
    fontWeight: '800',
  },

  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '38px 40px 60px',
    boxSizing: 'border-box',
  },

  pageHeading: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '20px',
    marginBottom: '28px',
  },

  eyebrow: {
    margin: '0 0 6px',
    color: '#2563eb',
    fontSize: '11px',
    fontWeight: '800',
    letterSpacing: '1.2px',
  },

  heading: {
    margin: 0,
    fontSize: '30px',
    color: '#111827',
    letterSpacing: '-0.7px',
  },

  headingDescription: {
    margin: '7px 0 0',
    color: '#64748b',
    fontSize: '14px',
  },

  message: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '13px 16px',
    marginBottom: '22px',
    borderRadius: '10px',
    backgroundColor: '#ecfdf5',
    border: '1px solid #bbf7d0',
    color: '#166534',
    fontSize: '14px',
  },

  statusPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '9px 14px',
    borderRadius: '30px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    color: '#475569',
    fontSize: '13px',
    fontWeight: '600',
  },

  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },

  cards: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '18px',
  },

  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '18px',
    backgroundColor: '#ffffff',
    padding: '24px',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
    boxShadow:
      '0 4px 15px rgba(15, 23, 42, 0.05)',
  },

  cardIcon: {
    width: '52px',
    height: '52px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '23px',
    flexShrink: 0,
  },

  cardLabel: {
    margin: '0 0 4px',
    color: '#64748b',
    fontSize: '10px',
    fontWeight: '800',
    letterSpacing: '0.7px',
  },

  cardNumber: {
    display: 'block',
    fontSize: '30px',
    lineHeight: '1.1',
    color: '#111827',
  },

  cardStatus: {
    display: 'block',
    fontSize: '25px',
    lineHeight: '1.2',
    color: '#111827',
  },

  cardDescription: {
    margin: '4px 0 0',
    color: '#94a3b8',
    fontSize: '12px',
  },

  welcomeBox: {
    marginTop: '22px',
    padding: '25px',
    backgroundColor: '#172033',
    color: '#ffffff',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '18px',
    boxShadow:
      '0 6px 20px rgba(15, 23, 42, 0.12)',
  },

  welcomeIcon: {
    width: '45px',
    height: '45px',
    borderRadius: '11px',
    backgroundColor: '#2563eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    flexShrink: 0,
  },

  welcomeTitle: {
    margin: '2px 0 7px',
    fontSize: '17px',
  },

  welcomeText: {
    margin: 0,
    color: '#aebbd0',
    fontSize: '13px',
    lineHeight: '1.6',
  },

  quickSection: {
    marginTop: '30px',
  },

  sectionTitle: {
    margin: '0 0 14px',
    fontSize: '18px',
    color: '#1e293b',
  },

  quickGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '15px',
  },

  quickCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    textAlign: 'left',
    padding: '18px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    cursor: 'pointer',
    color: '#1e293b',
  },

  quickIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '19px',
    flexShrink: 0,
  },

  arrow: {
    marginLeft: 'auto',
    fontSize: '20px',
    color: '#2563eb',
  },

  tableCard: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    boxShadow:
      '0 4px 15px rgba(15, 23, 42, 0.05)',
  },

  tableTop: {
    padding: '20px 22px',
    borderBottom: '1px solid #e2e8f0',
  },

  tableTitle: {
    margin: 0,
    fontSize: '17px',
    color: '#1e293b',
  },

  tableDescription: {
    margin: '4px 0 0',
    color: '#94a3b8',
    fontSize: '12px',
  },

  tableContainer: {
    width: '100%',
    overflowX: 'auto',
  },

  table: {
    width: '100%',
    minWidth: '950px',
    borderCollapse: 'collapse',
  },

  th: {
    padding: '14px 18px',
    textAlign: 'left',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    color: '#64748b',
    fontSize: '11px',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  td: {
    padding: '15px 18px',
    borderBottom: '1px solid #edf2f7',
    color: '#475569',
    fontSize: '13px',
  },

  tr: {
    backgroundColor: '#ffffff',
  },

  candidateCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '11px',
  },

  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    backgroundColor: '#dbeafe',
    color: '#2563eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '14px',
    flexShrink: 0,
  },

  candidateName: {
    display: 'block',
    color: '#1e293b',
    fontSize: '13px',
  },

  candidateId: {
    display: 'block',
    marginTop: '2px',
    color: '#94a3b8',
    fontSize: '10px',
  },

  period: {
    color: '#475569',
  },

  statusSelect: {
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#334155',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    outline: 'none',
  },

  viewButton: {
    padding: '8px 13px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '700',
  },

  countBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    padding: '9px 14px',
    borderRadius: '9px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    color: '#64748b',
    fontSize: '12px',
  },

  empty: {
    padding: '70px 30px',
    textAlign: 'center',
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
  },

  emptyIcon: {
    fontSize: '45px',
    marginBottom: '12px',
  },

  emptyTitle: {
    margin: 0,
    color: '#1e293b',
    fontSize: '18px',
  },

  emptyText: {
    maxWidth: '430px',
    margin: '8px auto 0',
    color: '#94a3b8',
    fontSize: '13px',
    lineHeight: '1.5',
  },

  recruitmentGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '20px',
  },

  recruitmentCard: {
    backgroundColor: '#ffffff',
    padding: '25px',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
    boxShadow:
      '0 4px 15px rgba(15, 23, 42, 0.05)',
  },

  recruitmentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },

  recruitmentIcon: {
    width: '50px',
    height: '50px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '21px',
    flexShrink: 0,
  },

  recruitmentTitle: {
    margin: 0,
    color: '#1e293b',
    fontSize: '16px',
  },

  recruitmentDescription: {
    margin: '5px 0 0',
    color: '#94a3b8',
    fontSize: '12px',
  },

  divider: {
    height: '1px',
    backgroundColor: '#e2e8f0',
    margin: '23px 0',
  },

  settingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '15px',
  },

  currentLabel: {
    display: 'block',
    color: '#94a3b8',
    fontSize: '11px',
    marginBottom: '5px',
  },

  currentValue: {
    display: 'block',
    fontSize: '14px',
  },

  toggleButton: {
    padding: '10px 18px',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '13px',
  },

  spotsContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '20px',
  },

  bigNumber: {
    display: 'block',
    fontSize: '34px',
    color: '#111827',
  },

  counter: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },

  counterButton: {
    width: '40px',
    height: '40px',
    border: 'none',
    borderRadius: '9px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '23px',
    cursor: 'pointer',
  },

  counterValue: {
    minWidth: '35px',
    textAlign: 'center',
    fontSize: '22px',
    fontWeight: '800',
    color: '#1e293b',
  },

  warningBox: {
    marginTop: '20px',
    display: 'flex',
    gap: '13px',
    alignItems: 'flex-start',
    padding: '18px 20px',
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '12px',
    color: '#92400e',
  },

  warningIcon: {
    fontSize: '20px',
  },

  /* ================= MODALE ================= */

  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '25px',
    zIndex: 1000,
    boxSizing: 'border-box',
  },

  modal: {
    width: '100%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflowY: 'auto',
    backgroundColor: '#ffffff',
    borderRadius: '18px',
    boxShadow:
      '0 20px 50px rgba(15, 23, 42, 0.25)',
  },

  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '25px 28px',
    backgroundColor: '#172033',
    color: '#ffffff',
    borderRadius: '18px 18px 0 0',
  },

  modalEyebrow: {
    margin: '0 0 5px',
    color: '#60a5fa',
    fontSize: '10px',
    fontWeight: '800',
    letterSpacing: '1px',
  },

  modalTitle: {
    margin: 0,
    fontSize: '22px',
  },

  closeButton: {
    width: '35px',
    height: '35px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#263247',
    color: '#ffffff',
    fontSize: '25px',
    cursor: 'pointer',
    lineHeight: '1',
  },

  detailsGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '14px',
    padding: '24px 28px',
    backgroundColor: '#f8fafc',
  },

  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },

  detailItemSpan: {
    color: '#94a3b8',
    fontSize: '11px',
  },

  detailStatus: {
    color: '#2563eb',
  },

  modalDivider: {
    height: '1px',
    backgroundColor: '#e2e8f0',
    margin: '0 28px',
  },

  commentsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px 28px 15px',
  },

  commentsTitle: {
    margin: 0,
    color: '#1e293b',
    fontSize: '18px',
  },

  commentsDescription: {
    margin: '4px 0 0',
    color: '#94a3b8',
    fontSize: '12px',
  },

  commentsCount: {
    minWidth: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#dbeafe',
    color: '#2563eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '12px',
  },

  commentsLoading: {
    margin: '0 28px',
    padding: '20px',
    textAlign: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    color: '#64748b',
    fontSize: '13px',
  },

  noComments: {
    margin: '0 28px',
    padding: '25px',
    textAlign: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    color: '#94a3b8',
  },

  commentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    margin: '0 28px',
    maxHeight: '250px',
    overflowY: 'auto',
  },

  comment: {
    padding: '14px 16px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
  },

  commentTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '15px',
  },

  commentAuthor: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#1e293b',
    fontSize: '12px',
  },

  commentAvatar: {
    width: '27px',
    height: '27px',
    borderRadius: '8px',
    backgroundColor: '#dbeafe',
    color: '#2563eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '11px',
  },

  commentDate: {
    color: '#94a3b8',
    fontSize: '10px',
  },

  commentText: {
    margin: '10px 0 0',
    color: '#475569',
    fontSize: '13px',
    lineHeight: '1.5',
  },

  commentForm: {
    margin: '20px 28px 28px',
    padding: '18px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
  },

  commentLabel: {
    display: 'block',
    marginBottom: '8px',
    color: '#334155',
    fontSize: '12px',
    fontWeight: '700',
  },

  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px',
    border: '1px solid #cbd5e1',
    borderRadius: '9px',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    fontFamily: 'inherit',
    fontSize: '13px',
    resize: 'vertical',
    outline: 'none',
  },

  commentFormBottom: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '15px',
    marginTop: '10px',
  },

  commentHint: {
    color: '#94a3b8',
    fontSize: '10px',
  },

  commentButton: {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '700',
  },

  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '20px 40px',
    borderTop: '1px solid #dbe2ea',
    color: '#94a3b8',
    fontSize: '12px',
    backgroundColor: '#f8fafc',
  },

  loadingPage: {
    minHeight: '100vh',
    backgroundColor: '#eef2f7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Arial, sans-serif',
  },

  loadingCard: {
    backgroundColor: '#ffffff',
    padding: '35px 50px',
    borderRadius: '14px',
    textAlign: 'center',
    boxShadow:
      '0 5px 20px rgba(15, 23, 42, 0.08)',
    color: '#64748b',
  },

  spinner: {
    width: '32px',
    height: '32px',
    margin: '0 auto 15px',
    borderRadius: '50%',
    border: '4px solid #dbeafe',
    borderTop: '4px solid #2563eb',
  },

  accessPage: {
    minHeight: '100vh',
    backgroundColor: '#eef2f7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  },

  accessCard: {
    maxWidth: '450px',
    width: '100%',
    backgroundColor: '#ffffff',
    padding: '40px',
    borderRadius: '16px',
    textAlign: 'center',
    boxShadow:
      '0 8px 30px rgba(15, 23, 42, 0.1)',
  },

  accessIcon: {
    fontSize: '45px',
    marginBottom: '15px',
  },

  backButton: {
    marginTop: '15px',
    padding: '11px 20px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    cursor: 'pointer',
    fontWeight: '600',
  },
}

export default Administration