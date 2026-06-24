/**
 * Premium animation variants for Framer Motion
 * Based on textile/fabric-inspired motion design
 */

import tokens from '../../design-tokens/theme.json'

// Standard easing curves
export const EASE = tokens.motion.ease.smooth as [number, number, number, number]
export const EASE_SPRING = tokens.motion.ease.spring as [number, number, number, number]
export const EASE_FABRIC = tokens.motion.ease.fabric as [number, number, number, number]

// Spring configurations
export const SPRING_GENTLE = tokens.motion.spring.gentle
export const SPRING_RESPONSIVE = tokens.motion.spring.responsive
export const SPRING_BOUNCY = tokens.motion.spring.bouncy

// Durations
export const DURATION = tokens.motion.duration

// ==================== Page Transitions ====================

export const pageTransition = {
  hidden: { opacity: 0, y: 32 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: DURATION.slow / 1000, 
      ease: EASE 
    } 
  },
  exit: { 
    opacity: 0, 
    y: -16, 
    transition: { 
      duration: DURATION.fast / 1000,
      ease: EASE_SPRING 
    } 
  }
}

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { 
      duration: DURATION.base / 1000, 
      ease: EASE 
    } 
  }
}

export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: DURATION.base / 1000, 
      ease: EASE 
    }
  }
}

export const fadeUpFast = {
  hidden: { opacity: 0, y: 12 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: DURATION.fast / 1000, 
      ease: EASE_SPRING 
    }
  }
}

export const slideInLeft = {
  hidden: { opacity: 0, x: -32 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { 
      duration: DURATION.base / 1000, 
      ease: EASE_FABRIC 
    }
  }
}

export const slideInRight = {
  hidden: { opacity: 0, x: 32 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { 
      duration: DURATION.base / 1000, 
      ease: EASE_FABRIC 
    }
  }
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: DURATION.base / 1000, 
      ease: EASE 
    }
  }
}

// ==================== List/Grid Animations ====================

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.1
    }
  }
}

export const staggerFast = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05
    }
  }
}

export const staggerSlow = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15
    }
  }
}

export const gridItem = {
  hidden: { opacity: 0, y: 16, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: DURATION.base / 1000,
      ease: EASE
    }
  }
}

// ==================== Interactive Animations ====================

export const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -4,
    transition: {
      type: 'spring' as const,
      ...SPRING_RESPONSIVE
    }
  },
  tap: {
    scale: 0.98,
    transition: {
      type: 'spring' as const,
      ...SPRING_BOUNCY
    }
  }
}

export const buttonSpring = {
  type: 'spring' as const,
  ...SPRING_RESPONSIVE
}

export const buttonHover = {
  scale: 1.03,
  transition: buttonSpring
}

export const buttonTap = {
  scale: 0.97,
  transition: buttonSpring
}

// ==================== Loading Animations ====================

export const shimmer = {
  initial: { backgroundPosition: '-200% 0' },
  animate: {
    backgroundPosition: '200% 0',
    transition: {
      duration: 1.5,
      ease: 'linear',
      repeat: Infinity
    }
  }
}

export const pulse = {
  animate: {
    opacity: [1, 0.7, 1],
    transition: {
      duration: 2,
      ease: 'easeInOut',
      repeat: Infinity
    }
  }
}

export const spin = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      ease: 'linear',
      repeat: Infinity
    }
  }
}

// ==================== Modal/Overlay Animations ====================

export const modalBackdrop = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      duration: DURATION.fast / 1000
    }
  },
  exit: {
    opacity: 0,
    transition: {
      duration: DURATION.fast / 1000
    }
  }
}

export const modalContent = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      ...SPRING_RESPONSIVE
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: {
      duration: DURATION.fast / 1000,
      ease: EASE
    }
  }
}

// ==================== Utility Functions ====================

/**
 * Create a stagger container with custom delay
 */
export const createStagger = (childDelay: number = 0.07, containerDelay: number = 0) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: childDelay,
      delayChildren: containerDelay
    }
  }
})

/**
 * Create a fade up variant with custom values
 */
export const createFadeUp = (y: number = 20, duration: number = DURATION.base) => ({
  hidden: { opacity: 0, y },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration / 1000,
      ease: EASE
    }
  }
})

/**
 * Get reduced motion preference
 */
export const shouldReduceMotion = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Conditionally apply animation based on reduced motion preference
 */
export const withReducedMotion = <T>(animation: T, fallback: T): T => {
  return shouldReduceMotion() ? fallback : animation
}
