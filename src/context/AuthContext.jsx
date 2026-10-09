import React, { createContext, useContext, useEffect, useState } from 'react'
import { loadItem, saveItem } from '../lib/storage'
import { SEED_USERS } from '../lib/seed'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(() => loadItem('users', SEED_USERS))
  const [currentUser, setCurrentUser] = useState(() => loadItem('session', null))

  useEffect(() => {
    saveItem('users', users)
  }, [users])

  useEffect(() => {
    saveItem('session', currentUser)
  }, [currentUser])

  function login(username, password) {
    const found = users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
    )
    if (!found) return { ok: false, message: 'Username atau kata sandi salah.' }
    if (!found.active) return { ok: false, message: 'Akun ini sudah dinonaktifkan. Hubungi owner.' }
    setCurrentUser(found)
    return { ok: true, user: found }
  }

  function logout() {
    setCurrentUser(null)
  }

  function addAdmin({ name, username, password }) {
    if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return { ok: false, message: 'Username sudah digunakan.' }
    }
    const newAdmin = {
      id: `u-${Date.now()}`,
      role: 'admin',
      name,
      username,
      password,
      active: true,
    }
    setUsers((prev) => [...prev, newAdmin])
    return { ok: true }
  }

  function toggleAdminActive(id) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, active: !u.active } : u)))
  }

  function resetAdminPassword(id, newPassword) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, password: newPassword } : u)))
  }

  const admins = users.filter((u) => u.role === 'admin')

  return (
    <AuthContext.Provider
      value={{ currentUser, login, logout, admins, addAdmin, toggleAdminActive, resetAdminPassword }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>')
  return ctx
}
