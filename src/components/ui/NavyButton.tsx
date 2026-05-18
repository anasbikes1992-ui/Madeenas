import { ButtonHTMLAttributes, forwardRef } from 'react'

interface NavyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export const NavyButton = forwardRef<HTMLButtonElement, NavyButtonProps>(
  ({ className = '', variant = 'solid', size = 'md', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
    
    const sizeStyles = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-5 py-3 text-sm',
      lg: 'px-7 py-3.5 text-base',
    }
    
    const variantStyles = {
      solid: 'bg-gradient-to-r from-navy-700 via-navy-800 to-slate-900 text-white shadow-[0_16px_34px_rgba(30,64,175,0.18)] hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(30,64,175,0.24)] focus:ring-navy-300',
      outline: 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 focus:ring-slate-300',
      ghost: 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 focus:ring-slate-300',
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
