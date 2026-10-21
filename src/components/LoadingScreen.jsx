import React from 'react'
import { Leaf, Sprout } from 'lucide-react'

export default function LoadingScreen({ message = 'Memeriksa sesi Anda' }) {
  return <main className="loading-screen relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12" role="status" aria-live="polite">
    <div className="loading-glow loading-glow-left pointer-events-none absolute -left-24 -top-28 h-80 w-80 rounded-full blur-3xl" />
    <div className="loading-glow loading-glow-right pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full blur-3xl" />
    <section className="relative w-full max-w-sm py-8 text-center">
      <div className="loading-garden relative mx-auto mb-8 flex h-40 w-40 items-center justify-center" aria-hidden="true">
        <span className="loading-ring loading-ring-outer absolute inset-1 rounded-full border border-plantation-800/10" />
        <span className="loading-ring loading-ring-inner absolute inset-4 rounded-full border border-dashed border-gold-600/35" />
        <span className="loading-seed absolute bottom-7 h-3 w-3 rounded-full bg-gold-500 shadow-[0_0_22px_rgba(201,138,46,.45)]" />
        <Leaf className="loading-leaf loading-leaf-left absolute left-5 top-12 h-10 w-10 text-plantation-600" strokeWidth={1.7} />
        <Leaf className="loading-leaf loading-leaf-right absolute right-5 top-10 h-9 w-9 rotate-45 text-plantation-800" strokeWidth={1.7} />
        <span className="relative flex h-20 w-20 items-center justify-center rounded-[1.8rem] bg-white/75 text-plantation-800 shadow-[0_12px_32px_rgba(17,45,35,.1)] ring-1 ring-plantation-900/5 backdrop-blur"><Sprout className="loading-sprout h-12 w-12" strokeWidth={1.6} /></span>
        <Leaf className="loading-leaf loading-leaf-top absolute left-[4.4rem] top-1 h-7 w-7 text-gold-600" strokeWidth={1.8} />
      </div>
      <p className="font-display text-3xl tracking-tight text-plantation-950">Kebun Kas</p>
      <p className="mt-2 text-sm text-ink-500">{message}</p>
      <p className="mt-1 text-xs text-ink-400">Sebentar, kami siapkan semuanya.</p>
      <div className="loading-progress-track mx-auto mt-7 h-1.5 w-40 overflow-hidden rounded-full"><span className="loading-progress block h-full w-1/3 rounded-full bg-gradient-to-r from-plantation-700 via-gold-500 to-plantation-700" /></div>
    </section>
  </main>
}
