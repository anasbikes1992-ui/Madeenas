import { HTMLAttributes, ReactNode } from 'react'

interface PremiumCardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  glow?: boolean
  children: ReactNode
}

export function PremiumCard({ 
  className = '', 
  hover = false, 
  glow = false, 
  children, 
  ...props 
}: PremiumCardProps) {
  const baseStyles = 'surface-card-soft relative overflow-hidden rounded-3xl border border-white/70 bg-[linear-gradient(145deg,#ffffff_0%,#f8fbff_48%,#eef4ff_100%)] p-8 shadow-[0_20px_55px_rgba(30,64,175,0.12)]'
  const hoverStyles = hover ? 'transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_74px_rgba(15,23,42,0.16)] hover:border-sky-200/80' : ''
  const glowStyles = glow ? 'animate-glow' : ''
  
  return (
    <div 
      className={`${baseStyles} ${hoverStyles} ${glowStyles} ${className}`}
      {...props}
    >
      <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-sky-200/35 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 left-6 h-24 w-24 rounded-full bg-amber-200/25 blur-2xl" />
      {children}
    </div>
  )
}
