import { ButtonHTMLAttributes, forwardRef } from 'react'

interface NavyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export const NavyButton = forwardRef<HTMLButtonElement, NavyButtonProps>(
  ({ className = '', variant = 'solid', size = 'md', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]'
    
    const sizeStyles = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-5 py-3 text-sm',
      lg: 'px-7 py-3.5 text-base',
    }
    
    const variantStyles = {
      solid: 'bg-[linear-gradient(115deg,#0f2a68_0%,#1d3f88_45%,#15274d_100%)] text-white shadow-[0_18px_38px_rgba(15,42,104,0.26)] hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(15,42,104,0.34)] focus:ring-blue-300',
      outline: 'border border-sky-200 bg-[linear-gradient(120deg,#ffffff_0%,#f2f8ff_100%)] text-navy-800 hover:border-sky-300 hover:bg-[linear-gradient(120deg,#f8fbff_0%,#eaf3ff_100%)] focus:ring-sky-200',
      ghost: 'text-navy-700 hover:bg-sky-100/70 hover:text-navy-900 focus:ring-sky-200',
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
