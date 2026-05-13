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
  const baseStyles = 'bg-white rounded-2xl p-8 border border-navy-100'
  const hoverStyles = hover ? 'transition-all duration-300 hover:shadow-premium-lg hover:-translate-y-1' : ''
  const glowStyles = glow ? 'animate-glow' : ''
  
  return (
    <div 
      className={`${baseStyles} ${hoverStyles} ${glowStyles} shadow-premium ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
