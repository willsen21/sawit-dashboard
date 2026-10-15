import React, { createContext, useContext, useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { loadItem, saveItem } from '../lib/storage'
import { SEED_USERS } from '../lib/seed'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(() => loadItem('users', SEED_USERS))
  const [currentUser, setCurrentUser] = useState(() => isSupabaseConfigured ? null : loadItem('session', null))
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    let mounted = true
    const loadProfile = async (authUser) => {
      if (!authUser) {
        if (mounted) setCurrentUser(null)
        return
      }
      const { data, error } = await supabase.from('profiles')
        .select('id, display_name, email, role, active')
        .eq('id', authUser.id)
        .maybeSingle()
      if (error || !data || !data.active) {
        await supabase.auth.signOut()
        if (mounted) setCurrentUser(null)
        return
      }
      if (mounted) setCurrentUser({ id: data.id, name: data.display_name, role: data.role, active: data.active, email: authUser.email })
    }

    supabase.auth.getSession().then(({ data: { session } }) => loadProfile(session?.user || null))
      .catch((error) => console.error('Gagal memuat sesi Supabase:', error))
      .finally(() => { if (mounted) setAuthReady(true) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthReady(false)
      queueMicrotask(() => {
        loadProfile(session?.user || null).finally(() => { if (mounted) setAuthReady(true) })
      })
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) saveItem('users', users)
  }, [users])

  useEffect(() => {
    if (isSupabaseConfigured || !currentUser) return
    saveItem('session', currentUser)
  }, [currentUser])

  useEffect(() => {
    if (!isSupabaseConfigured || !currentUser || currentUser.role !== 'owner') return
    let active = true
    supabase.from('profiles').select('id, display_name, email, role, active').eq('role', 'admin')
      .then(({ data, error }) => {
        if (error) console.error('Gagal memuat daftar admin:', error)
        else if (active) setUsers(data.map((profile) => ({ id: profile.id, name: profile.display_name, username: profile.display_name, email: profile.email, role: profile.role, active: profile.active })))
      })
    return () => { active = false }
  }, [currentUser])

  async function login(identifier, password) {
    if (isSupabaseConfigured) {
      const username = identifier.trim().toLowerCase()
      const { data: loginData, error: loginError } = await supabase.functions.invoke('login-with-username', {
        body: { username, password },
      })
      if (loginError || !loginData?.access_token || !loginData?.refresh_token) {
        return { ok: false, message: 'Nama pengguna atau kata sandi salah.' }
      }
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: loginData.access_token,
        refresh_token: loginData.refresh_token,
      })
      if (sessionError || !sessionData.user) return { ok: false, message: 'Login gagal. Silakan coba lagi.' }
      const { data: profile, error: profileError } = await supabase.from('profiles')
        .select('id, display_name, email, role, active').eq('id', sessionData.user.id).maybeSingle()
      if (profileError || !profile || !profile.active) {
        await supabase.auth.signOut()
        return { ok: false, message: 'Akun belum diatur atau dinonaktifkan. Hubungi owner.' }
      }
      const user = { id: profile.id, name: profile.display_name, role: profile.role, active: profile.active, email: sessionData.user.email }
      setCurrentUser(user)
      return { ok: true, user }
    }

    if (import.meta.env.PROD) return { ok: false, message: 'Login cloud belum dikonfigurasi. Hubungi pengelola aplikasi.' }
    const found = users.find((user) => user.username.toLowerCase() === identifier.trim().toLowerCase() && user.password === password)
    if (!found) return { ok: false, message: 'Username atau kata sandi salah.' }
    if (!found.active) return { ok: false, message: 'Akun ini sudah dinonaktifkan. Hubungi owner.' }
    setCurrentUser(found)
    return { ok: true, user: found }
  }

  async function changePassword(currentPassword, newPassword) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        current_password: currentPassword,
      })
      if (error) return { ok: false, message: 'Gagal mengubah kata sandi. Periksa kata sandi lama dan coba lagi.' }
      return { ok: true }
    }

    const activeUser = users.find((user) => user.id === currentUser?.id)
    if (!activeUser || activeUser.password !== currentPassword) {
      return { ok: false, message: 'Kata sandi lama tidak sesuai.' }
    }
    setUsers((prev) => prev.map((user) => user.id === activeUser.id ? { ...user, password: newPassword } : user))
    setCurrentUser((prev) => prev ? { ...prev, password: newPassword } : prev)
    return { ok: true }
  }

  async function logout() {
    if (isSupabaseConfigured) await supabase.auth.signOut()
    setCurrentUser(null)
    if (!isSupabaseConfigured) saveItem('session', null)
  }

  function addAdmin({ name, username, email, password }) {
    if (isSupabaseConfigured) {
      return { ok: false, message: 'Buat pengguna melalui Supabase → Authentication → Users, lalu tambahkan profil admin sesuai panduan supabase/README.md.' }
    }
    if (users.some((user) => user.username.toLowerCase() === username.toLowerCase())) return { ok: false, message: 'Username sudah digunakan.' }
    setUsers((prev) => [...prev, { id: `u-${Date.now()}`, role: 'admin', name, username, password, active: true }])
    return { ok: true }
  }

  async function toggleAdminActive(id) {
    if (isSupabaseConfigured) {
      const target = users.find((user) => user.id === id)
      if (!target) return { ok: false, message: 'Akun admin tidak ditemukan.' }
      const { error } = await supabase.from('profiles').update({ active: !target.active }).eq('id', id)
      if (error) return { ok: false, message: 'Status admin gagal diperbarui.' }
      setUsers((prev) => prev.map((user) => user.id === id ? { ...user, active: !user.active } : user))
      return { ok: true }
    }
    setUsers((prev) => prev.map((user) => user.id === id ? { ...user, active: !user.active } : user))
    return { ok: true }
  }

  async function resetAdminPassword(id, newPassword) {
    if (isSupabaseConfigured) return { ok: false, message: 'Reset password cloud dilakukan oleh admin melalui alur pemulihan email Supabase.' }
    setUsers((prev) => prev.map((user) => user.id === id ? { ...user, password: newPassword } : user))
    return { ok: true }
  }

  const admins = users.filter((user) => user.role === 'admin')
  return <AuthContext.Provider value={{ currentUser, authReady, cloudMode: isSupabaseConfigured, login, logout, changePassword, admins, addAdmin, toggleAdminActive, resetAdminPassword }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>')
  return ctx
}
