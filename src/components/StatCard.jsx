import React, { useEffect, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'

export function AnimatedValue({ target, format, delay = 0 }) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      setValue(target)
      return undefined
    }
    let frame
    let startTime
    const startTimer = window.setTimeout(() => {
      const tick = (time) => {
        if (!startTime) startTime = time
        const progress = Math.min((time - startTime) / 1050, 1)
        const eased = 1 - (1 - progress) ** 3
        setValue(target * eased)
        if (progress < 1) frame = window.requestAnimationFrame(tick)
      }
      frame = window.requestAnimationFrame(tick)
    }, delay)
    return () => {
      window.clearTimeout(startTimer)
      window.cancelAnimationFrame(frame)
    }
  }, [target, delay])

  return format(value)
}

export default function StatCard({ label, value, numericValue, formatValue, delay = 0, sub, trend, tone = 'default', onClick, icon }) {
  const toneClasses = {
    default: 'text-ink-900',
    gold: 'text-gold-600',
    danger: 'text-red-700',
  }
  const accentClass = tone === 'gold' ? 'stat-card-gold' : tone === 'danger' ? 'stat-card-danger' : ''

  return (
    <button type="button" onClick={onClick} style={{ '--stat-delay': `${delay}ms` }} className={`stat-card ${accentClass} card p-5 text-left ${onClick ? 'stat-card-action cursor-pointer hover:border-plantation-700/35' : 'cursor-default'}`}>
      <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-ink-500">{label}</p>{icon ? <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone === 'gold' ? 'bg-gold-400/15 text-gold-600' : 'bg-plantation-700/10 text-plantation-700'}`}>{icon}</span> : onClick && <span className="flex h-7 w-7 items-center justify-center rounded-full bg-plantation-700/8 text-plantation-700"><ArrowUpRight size={14} /></span>}</div>
      <p className={`font-display text-[28px] leading-tight mt-1.5 ${toneClasses[tone]}`}>{Number.isFinite(numericValue) ? <AnimatedValue target={numericValue} format={formatValue} delay={delay} /> : value}</p>
      {(sub || trend) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {trend !== undefined && trend !== null && (
            <span className={trend >= 0 ? 'text-plantation-700' : 'text-red-600'}>
              {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {sub && <span className="text-ink-500">{sub}</span>}
        </div>
      )}
    </button>
  )
}
