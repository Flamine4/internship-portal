import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'

function TableauDeBord() {
  const [profil, setProfil] = useState(null)
  const [candidature, setCandidature] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const navigate = useNavigate()

  useEffect(() => {
    chargerDonnees()
  }, [])

  async function chargerDonnees() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      navigate('/connexion')
      return
    }

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

    const { data: candidatureData, error: candidatureError } = await supabase
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
        <section>
          <h2>
            Bonjour {profil?.full_name} 👋
          </h2>

          <p>
            Bienvenue dans ton espace candidat.
          </p>
        </section>

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

        {message && <p>{message}</p>}
      </main>
    </div>
  )
}

export default TableauDeBord