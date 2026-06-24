/**
 * Luxury Button Component
 * Premium textile-inspired button with sophisticated animations
 */

'use client'

import { motion } from 'framer-motion'
import { type ReactNode } from 'react'
import { buttonSpring } from '@/lib/animations'
import { cn } from '@/lib/utils'

interface LuxuryButtonProps {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  className?: string
}

const variantStyles = {
  primary: {
    base: 'bg-gradient-indigo text-white border-primary/20',
    hover: 'hover:shadow-glow-indigo',
    active: 'active:bg-primary-dark'
  },
  secondary: {
    base: 'bg-surface-card text-text-primary border-border-base',
    hover: 'hover:bg-surface-hover hover:border-border-accent',
    active: 'active:bg-surface-elevated'
  },
  accent: {
    base: 'bg-gradient-saffron text-navy-950 border-accent-saffron/20',
    hover: 'hover:shadow-glow-saffron',
    active: 'active:brightness-110'
  },
  ghost: {
    base: 'bg-transparent text-text-primary border-transparent',
    hover: 'hover:bg-surface-card hover:border-border-muted',
    active: 'active:bg-surface-elevated'
  },
  danger: {
    base: 'bg-semantic-error/10 text-semantic-error border-semantic-error/20',
    hover: 'hover:bg-semantic-error hover:text-white',
    active: 'active:brightness-90'
  }
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-base',
  lg: 'px-7 py-3.5 text-lg'
}

export function LuxuryButton({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className
}: LuxuryButtonProps) {
  const styles = variantStyles[variant]
  const sizeClass = sizeStyles[size]

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { scale: 1.02, y: -2 } : undefined}
      whileTap={!disabled && !loading ? { scale: 0.98 } : undefined}
      transition={buttonSpring}
      className={cn(
        'relative inline-flex items-center justify-center gap-2',
        'rounded-lg border font-medium tracking-wide',
        'transition-all duration-base',
        'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-surface-base',
        styles.base,
        !disabled && !loading && styles.hover,
        !disabled && !loading && styles.active,
        sizeClass,
        (disabled || loading) && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      {loading && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, ease: 'linear', repeat: Infinity }}
          className="h-4 w-4 rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </motion.button>
  )
}
