import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'

function Administration() {
  const [candidatures, setCandidatures] = useState([])
  const [recrutement, setRecrutement] = useState(null)
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
      setMessage("Accès refusé. Cette page est réservée à l'administrateur.")
      setLoading(false)
      return
    }

    await chargerDonnees()
  }

  async function chargerDonnees() {
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
      setMessage('Impossible de récupérer les candidatures.')
      setLoading(false)
      return
    }

    setCandidatures(data || [])

    const { data: settings } = await supabase
      .from('recruitment_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    setRecrutement(settings)
    setLoading(false)
  }

  async function modifierStatut(applicationId, nouveauStatut) {
    const { error } = await supabase
      .from('applications')
      .update({
        status: nouveauStatut,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)

    if (error) {
      setMessage('Erreur lors de la modification du statut.')
      return
    }

    setMessage('Statut modifié avec succès.')
    await chargerDonnees()
  }

  async function modifierRecrutement(champ, valeur) {
    const { error } = await supabase
      .from('recruitment_settings')
      .update({
        [champ]: valeur,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)

    if (error) {
      setMessage('Erreur lors de la modification.')
      return
    }

    await chargerDonnees()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/connexion')
  }

  if (loading) {
    return <p>Chargement...</p>
  }

  if (message && candidatures.length === 0) {
    return (
      <div>
        <h1>Administration</h1>
        <p>{message}</p>
        <button onClick={() => navigate('/dashboard')}>
          Retour
        </button>
      </div>
    )
  }

  return (
    <div>
      <header>
        <h1>Administration</h1>

        <button onClick={handleLogout}>
          Se déconnecter
        </button>
      </header>

      <main>
        <section>
          <h2>Gestion du recrutement</h2>

          <p>
            Recrutement :{' '}
            <strong>
              {recrutement?.is_active ? 'Ouvert' : 'Fermé'}
            </strong>
          </p>

          <button
            onClick={() =>
              modifierRecrutement(
                'is_active',
                !recrutement?.is_active
              )
            }
          >
            {recrutement?.is_active
              ? 'Fermer le recrutement'
              : 'Ouvrir le recrutement'}
          </button>

          <p>
            Nombre de places disponibles :{' '}
            <strong>{recrutement?.available_spots ?? 0}</strong>
          </p>

          <button
            onClick={() =>
              modifierRecrutement(
                'available_spots',
                Math.max(
                  0,
                  (recrutement?.available_spots ?? 0) - 1
                )
              )
            }
          >
            -
          </button>

          <button
            onClick={() =>
              modifierRecrutement(
                'available_spots',
                (recrutement?.available_spots ?? 0) + 1
              )
            }
          >
            +
          </button>
        </section>

        <section>
          <h2>Candidatures</h2>

          {candidatures.length === 0 ? (
            <p>Aucune candidature pour le moment.</p>
          ) : (
            candidatures.map((candidature) => (
              <article key={candidature.id}>
                <hr />

                <h3>
                  {candidature.profiles?.full_name}
                </h3>

                <p>
                  École : {candidature.profiles?.school || 'Non renseignée'}
                </p>

                <p>
                  Spécialité :{' '}
                  {candidature.profiles?.specialty || 'Non renseignée'}
                </p>

                <p>
                  Période : {candidature.internship_period}
                </p>

                <p>
                  Statut actuel : <strong>{candidature.status}</strong>
                </p>

                <label>
                  Modifier le statut :
                </label>

                <select
                  value={candidature.status}
                  onChange={(e) =>
                    modifierStatut(
                      candidature.id,
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
              </article>
            ))
          )}
        </section>

        {message && <p>{message}</p>}
      </main>
    </div>
  )
}

export default Administration