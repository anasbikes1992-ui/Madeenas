import { ButtonHTMLAttributes, forwardRef } from 'react'

interface GoldButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export const GoldButton = forwardRef<HTMLButtonElement, GoldButtonProps>(
  ({ className = '', variant = 'solid', size = 'md', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
    
    const sizeStyles = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-5 py-3 text-sm',
      lg: 'px-7 py-3.5 text-base',
    }
    
    const variantStyles = {
      solid: 'bg-gradient-to-r from-gold-400 via-gold-500 to-amber-600 text-navy-950 shadow-[0_16px_34px_rgba(196,144,28,0.22)] hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(196,144,28,0.28)] focus:ring-amber-300',
      outline: 'border border-amber-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50 focus:ring-amber-200',
      ghost: 'text-amber-700 hover:bg-amber-50 hover:text-amber-800 focus:ring-amber-200',
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
