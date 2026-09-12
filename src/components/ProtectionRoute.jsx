import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'

function ProtectionRoute({ children, adminOnly = false }) {
  const [chargement, setChargement] = useState(true)
  const [autorise, setAutorise] = useState(false)

  useEffect(() => {
    verifierUtilisateur()
  }, [])

  async function verifierUtilisateur() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setChargement(false)
      return
    }

    // Si la route est réservée aux administrateurs
    if (adminOnly) {
      const { data: profil, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error || profil?.role !== 'admin') {
        setChargement(false)
        return
      }
    }

    setAutorise(true)
    setChargement(false)
  }

  if (chargement) {
    return <p>Vérification de l'accès...</p>
  }

  if (!autorise) {
    return <Navigate to="/connexion" replace />
  }

  return children
}

export default ProtectionRoute