import { ButtonHTMLAttributes, forwardRef } from 'react'

interface GoldButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export const GoldButton = forwardRef<HTMLButtonElement, GoldButtonProps>(
  ({ className = '', variant = 'solid', size = 'md', children, ...props }, ref) => {
    const baseStyles = 'font-semibold transition-all duration-300 rounded-lg inline-flex items-center justify-center gap-2'
    
    const sizeStyles = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    }
    
    const variantStyles = {
      solid: 'bg-gradient-to-r from-gold-500 to-gold-600 text-navy-900 hover:from-gold-600 hover:to-gold-700 shadow-gold hover:shadow-gold-lg hover:scale-105',
      outline: 'border-2 border-gold-500 text-gold-600 hover:bg-gold-50 hover:border-gold-600',
      ghost: 'text-gold-600 hover:bg-gold-50 hover:text-gold-700',
    }
    
    return (
      <button
        ref={ref}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  }
)

GoldButton.displayName = 'GoldButton'
