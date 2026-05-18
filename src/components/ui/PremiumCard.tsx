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
  const baseStyles = 'surface-card-soft relative overflow-hidden p-8'
  const hoverStyles = hover ? 'transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_72px_rgba(15,23,42,0.12)]' : ''
  const glowStyles = glow ? 'animate-glow' : ''
  
  return (
    <div 
      className={`${baseStyles} ${hoverStyles} ${glowStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
