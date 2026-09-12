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

    // Récupérer le profil
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

    // Récupérer les commentaires si une candidature existe
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
    { nom: 'Inscription', statut: 'registration' },
    { nom: 'Challenge', statut: 'challenge' },
    { nom: 'Entretien', statut: 'interview' },
    { nom: 'Admission', statut: 'admission' },
    { nom: 'Définition du sujet', statut: 'topic_definition' },
  ]

  const indexEtapeActuelle = etapes.findIndex(
    (etape) => etape.statut === candidature?.status
  )

  if (loading) {
    return <p>Chargement...</p>
  }

  return (
    <div>
      <header>
        <h1>Tableau de bord</h1>

        <button onClick={handleLogout}>
          Se déconnecter
        </button>
      </header>

      <main>
        {/* Bienvenue */}
        <section>
          <h2>Bonjour {profil?.full_name} 👋</h2>
          <p>Bienvenue dans ton espace candidat.</p>
        </section>

        {/* Informations */}
        <section>
          <h2>Mes informations</h2>

          <p>
            <strong>École :</strong>{' '}
            {profil?.school || 'Non renseignée'}
          </p>

          <p>
            <strong>Spécialité :</strong>{' '}
            {profil?.specialty || 'Non renseignée'}
          </p>

          <p>
            <strong>Période :</strong>{' '}
            {candidature?.internship_period || 'Non renseignée'}
          </p>
        </section>

        {/* Candidature */}
        <section>
          <h2>Ma candidature</h2>

          {!candidature ? (
            <div>
              <p>
                Tu n'as pas encore envoyé ta candidature.
              </p>

              <button onClick={() => navigate('/candidature')}>
                Compléter ma candidature
              </button>
            </div>
          ) : (
            <div>
              <p>
                <strong>Statut actuel :</strong>{' '}
                {candidature.status}
              </p>

              <h3>Progression</h3>

              {etapes.map((etape, index) => {
                const terminee = index <= indexEtapeActuelle
                const actuelle = index === indexEtapeActuelle

                return (
                  <div key={etape.statut}>
                    <span>
                      {terminee ? '✓' : '○'}
                    </span>{' '}

                    <strong>{etape.nom}</strong>

                    {actuelle && (
                      <span> ← Étape actuelle</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Commentaires */}
        {candidature && (
          <section>
            <h2>Commentaires de l'administration</h2>

            {commentaires.length === 0 ? (
              <p>
                Aucun commentaire pour le moment.
              </p>
            ) : (
              <div>
                {commentaires.map((commentaire) => (
                  <div key={commentaire.id}>
                    <p>
                      <strong>
                        {commentaire.profiles?.full_name ||
                          'Administration'}
                      </strong>
                    </p>

                    <p>{commentaire.content}</p>

                    <small>
                      {new Date(
                        commentaire.created_at
                      ).toLocaleString('fr-FR')}
                    </small>

                    <hr />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {message && <p>{message}</p>}
      </main>
    </div>
  )
}

export default TableauDeBord