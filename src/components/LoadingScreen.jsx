import React from 'react'
import { Leaf, LoaderCircle } from 'lucide-react'

export default function LoadingScreen({ message = 'Memeriksa sesi Anda' }) {
  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper-50 px-5 py-12" role="status" aria-live="polite">
    <div className="pointer-events-none absolute -left-24 -top-28 h-80 w-80 rounded-full bg-plantation-700/5 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-gold-400/10 blur-3xl" />
    <section className="relative w-full max-w-sm rounded-3xl border border-ink-900/8 bg-white/90 p-8 text-center shadow-soft backdrop-blur sm:p-10">
      <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-2 border-plantation-900/10" />
        <LoaderCircle className="absolute inset-0 h-20 w-20 animate-spin text-gold-600" strokeWidth={1.5} aria-hidden="true" />
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-plantation-950 text-gold-300 shadow-sm"><Leaf size={23} aria-hidden="true" /></span>
      </div>
      <p className="mt-6 font-display text-2xl text-plantation-950">Kebun Kas</p>
      <p className="mt-2 text-sm text-ink-500">{message}</p>
      <div className="mx-auto mt-6 h-1.5 w-36 overflow-hidden rounded-full bg-plantation-900/8"><span className="loading-progress block h-full w-1/2 rounded-full bg-gold-500" /></div>
    </section>
  </main>
}
