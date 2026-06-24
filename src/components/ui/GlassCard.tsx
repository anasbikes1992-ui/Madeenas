/**
 * Glass Card Component
 * Premium frosted glass effect with depth and elevation
 */

'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import { type ReactNode } from 'react'
import { fadeUp, SPRING_RESPONSIVE } from '@/lib/animations'
import { cn } from '@/lib/utils'

interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode
  variant?: 'elevated' | 'flat' | 'bordered' | 'glow'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  rounded?: 'md' | 'lg' | 'xl' | '2xl'
  hover?: boolean
  className?: string
}

const variantStyles = {
  elevated: 'bg-surface-card/80 backdrop-blur-xl shadow-lg border border-border-base',
  flat: 'bg-surface-card border border-border-muted',
  bordered: 'bg-surface-elevated/50 backdrop-blur-md border-2 border-border-accent',
  glow: 'bg-surface-card/90 backdrop-blur-xl shadow-glow-indigo border border-primary/20'
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-10'
}

const roundedStyles = {
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl'
}

export function GlassCard({
  children,
  variant = 'elevated',
  padding = 'md',
  rounded = 'xl',
  hover = false,
  className,
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
      transition={{ type: 'spring', ...SPRING_RESPONSIVE }}
      className={cn(
        'relative overflow-hidden',
        variantStyles[variant],
        paddingStyles[padding],
        roundedStyles[rounded],
        'transition-all duration-base',
        hover && 'cursor-pointer hover:border-border-accent hover:shadow-xl',
        className
      )}
      {...props}
    >
      {/* Subtle gradient mesh overlay */}
      {variant === 'elevated' && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-30" />
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  )
}
