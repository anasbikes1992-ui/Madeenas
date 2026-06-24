import { ButtonHTMLAttributes, forwardRef } from 'react'

interface GoldButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export const GoldButton = forwardRef<HTMLButtonElement, GoldButtonProps>(
  ({ className = '', variant = 'solid', size = 'md', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]'
    
    const sizeStyles = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-5 py-3 text-sm',
      lg: 'px-7 py-3.5 text-base',
    }
    
    const variantStyles = {
      solid: 'bg-[linear-gradient(110deg,#f5d67a_0%,#e0b24f_52%,#c18a28_100%)] text-navy-950 shadow-[0_18px_38px_rgba(193,138,40,0.28)] hover:-translate-y-0.5 hover:shadow-[0_24px_46px_rgba(193,138,40,0.34)] focus:ring-amber-300',
      outline: 'border border-amber-300/80 bg-[linear-gradient(120deg,#fffaf0_0%,#fff3d8_100%)] text-amber-800 hover:border-amber-400 hover:bg-[linear-gradient(120deg,#fff6e4_0%,#ffecbf_100%)] focus:ring-amber-200',
      ghost: 'text-amber-800 hover:bg-amber-100/70 hover:text-amber-900 focus:ring-amber-200',
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
