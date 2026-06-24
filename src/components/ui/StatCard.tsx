/**
 * Premium Stat Card Component
 * Displays metrics with textile-inspired design
 */

'use client'

import { motion } from 'framer-motion'
import { type LucideIcon } from 'lucide-react'
import { fadeUp, buttonSpring, SPRING_RESPONSIVE } from '@/lib/animations'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  Icon: LucideIcon
  trend?: {
    value: string
    direction: 'up' | 'down' | 'neutral'
  }
  description?: string
  variant?: 'indigo' | 'saffron' | 'terracotta' | 'sage' | 'emerald' | 'rose'
  onClick?: () => void
  className?: string
}

const variantStyles = {
  indigo: {
    gradient: 'from-primary/10 via-primary/5 to-transparent',
    iconBg: 'bg-primary/15',
    iconColor: 'text-primary-light',
    borderGlow: 'hover:border-primary/30 hover:shadow-glow-indigo',
    accentColor: 'text-primary-light'
  },
  saffron: {
    gradient: 'from-accent-saffron/10 via-accent-saffron/5 to-transparent',
    iconBg: 'bg-accent-saffron/15',
    iconColor: 'text-accent-saffron',
    borderGlow: 'hover:border-accent-saffron/30 hover:shadow-glow-saffron',
    accentColor: 'text-accent-saffron'
  },
  terracotta: {
    gradient: 'from-accent-terracotta/10 via-accent-terracotta/5 to-transparent',
    iconBg: 'bg-accent-terracotta/15',
    iconColor: 'text-accent-terracotta',
    borderGlow: 'hover:border-accent-terracotta/30 hover:shadow-glow-terracotta',
    accentColor: 'text-accent-terracotta'
  },
  sage: {
    gradient: 'from-accent-sage/10 via-accent-sage/5 to-transparent',
    iconBg: 'bg-accent-sage/15',
    iconColor: 'text-accent-sage',
    borderGlow: 'hover:border-accent-sage/30',
    accentColor: 'text-accent-sage'
  },
  emerald: {
    gradient: 'from-semantic-success/10 via-semantic-success/5 to-transparent',
    iconBg: 'bg-semantic-success/15',
    iconColor: 'text-semantic-success',
    borderGlow: 'hover:border-semantic-success/30',
    accentColor: 'text-semantic-success'
  },
  rose: {
    gradient: 'from-semantic-error/10 via-semantic-error/5 to-transparent',
    iconBg: 'bg-semantic-error/15',
    iconColor: 'text-semantic-error',
    borderGlow: 'hover:border-semantic-error/30',
    accentColor: 'text-semantic-error'
  }
}

const trendIcons = {
  up: '↗',
  down: '↘',
  neutral: '→'
}

const trendColors = {
  up: 'text-semantic-success',
  down: 'text-semantic-error',
  neutral: 'text-text-secondary'
}

export function StatCard({
  label,
  value,
  Icon,
  trend,
  description,
  variant = 'indigo',
  onClick,
  className
}: StatCardProps) {
  const styles = variantStyles[variant]
  const isInteractive = !!onClick

  return (
    <motion.div
      variants={fadeUp}
      whileHover={isInteractive ? { y: -4, scale: 1.01 } : undefined}
      whileTap={isInteractive ? { scale: 0.98 } : undefined}
      transition={{ type: 'spring', ...SPRING_RESPONSIVE }}
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border-base bg-gradient-to-br',
        styles.gradient,
        'backdrop-blur-sm transition-all duration-base',
        styles.borderGlow,
        isInteractive && 'cursor-pointer',
        className
      )}
    >
      {/* Subtle mesh gradient overlay */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-0 transition-opacity duration-slow group-hover:opacity-100" />

      <div className="relative p-6">
        {/* Icon */}
        <div className={cn(
          'mb-4 inline-flex rounded-lg p-3',
          styles.iconBg,
          'transition-transform duration-base group-hover:scale-110'
        )}>
          <Icon className={cn('h-5 w-5', styles.iconColor)} />
        </div>

        {/* Label */}
        <h3 className="mb-1 text-sm font-medium tracking-wide text-text-secondary uppercase">
          {label}
        </h3>

        {/* Value */}
        <div className="mb-2 flex items-baseline gap-2">
          <p className="font-heading text-3xl font-bold tracking-tight text-text-primary">
            {value}
          </p>
          {trend && (
            <span className={cn(
              'flex items-center gap-1 text-sm font-medium',
              trendColors[trend.direction]
            )}>
              <span className="text-lg">{trendIcons[trend.direction]}</span>
              {trend.value}
            </span>
          )}
        </div>

        {/* Description */}
        {description && (
          <p className={cn('text-sm', styles.accentColor)}>
            {description}
          </p>
        )}
      </div>

      {/* Bottom accent line */}
      <div className={cn(
        'h-1 w-full bg-gradient-to-r',
        variant === 'indigo' && 'from-primary via-primary-light to-transparent',
        variant === 'saffron' && 'from-accent-saffron via-accent-saffron/70 to-transparent',
        variant === 'terracotta' && 'from-accent-terracotta via-accent-terracotta/70 to-transparent',
        variant === 'sage' && 'from-accent-sage via-accent-sage/70 to-transparent',
        variant === 'emerald' && 'from-semantic-success via-semantic-success/70 to-transparent',
        variant === 'rose' && 'from-semantic-error via-semantic-error/70 to-transparent',
        'opacity-0 transition-opacity duration-base group-hover:opacity-100'
      )} />
    </motion.div>
  )
}
