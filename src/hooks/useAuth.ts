import { supabase } from '../lib/supabase'

export function useAuth() {
  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  const getSession = () => supabase.auth.getSession()

  return { login, logout, getSession }
}
