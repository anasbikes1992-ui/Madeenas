import { ButtonHTMLAttributes, forwardRef } from 'react'

interface NavyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export const NavyButton = forwardRef<HTMLButtonElement, NavyButtonProps>(
  ({ className = '', variant = 'solid', size = 'md', children, ...props }, ref) => {
    const baseStyles = 'font-semibold transition-all duration-300 rounded-lg inline-flex items-center justify-center gap-2'
    
    const sizeStyles = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    }
    
    const variantStyles = {
      solid: 'bg-gradient-to-br from-navy-600 to-navy-700 text-white hover:from-navy-700 hover:to-navy-800 shadow-navy hover:shadow-navy-lg hover:scale-105',
      outline: 'border-2 border-navy-600 text-navy-600 hover:bg-navy-50 hover:border-navy-700',
      ghost: 'text-navy-600 hover:bg-navy-50 hover:text-navy-700',
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

NavyButton.displayName = 'NavyButton'
