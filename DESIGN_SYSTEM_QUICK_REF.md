# Premium Design System - Quick Reference Card

## 🎨 Color Classes Quick Reference

### Text Colors
```tsx
text-text-primary      // #F5F5F7 - Main text
text-text-secondary    // #A0A4B8 - Supporting text
text-text-muted        // #6B7089 - Subtle text
text-text-accent       // #E8A846 - Highlighted text
```

### Background Colors
```tsx
bg-surface-base        // #0A0E17 - Page background
bg-surface-elevated    // #131823 - Raised elements
bg-surface-card        // #1A1F2E - Cards
bg-surface-hover       // #222838 - Hover states
```

### Accent Colors
```tsx
bg-primary            // #4A5FD1 - Indigo
bg-accent-saffron     // #E8A846 - Warm gold
bg-accent-terracotta  // #D4735C - Earthy red
bg-accent-sage        // #8FA58E - Natural green
bg-semantic-success   // #52C98B - Green
bg-semantic-warning   // #E8A846 - Amber
bg-semantic-error     // #EF6B6B - Red
```

### Border Colors
```tsx
border-border-base    // rgba(255,255,255,0.08)
border-border-muted   // rgba(255,255,255,0.05)
border-border-accent  // rgba(74,95,209,0.2)
```

---

## 📝 Typography Classes

### Headings (Playfair Display)
```tsx
font-heading text-4xl font-bold tracking-tight  // Page titles
font-heading text-2xl font-bold                 // Section titles
font-heading text-lg font-bold                  // Card titles
```

### Body (Inter)
```tsx
font-sans text-base text-text-primary     // Normal text
font-sans text-sm text-text-secondary     // Small text
font-mono text-sm text-text-muted         // Code/SKUs
```

### Special
```tsx
text-sm uppercase tracking-wide text-text-secondary  // Labels
font-heading text-xl font-bold text-accent-saffron   // Prices
```

---

## 🎬 Animation Imports

```tsx
import {
  pageTransition,       // Page enter/exit
  fadeUp,               // Fade up on mount
  staggerContainer,     // Stagger children
  gridItem,             // Grid item animation
  cardHover,            // Card hover effect
  modalBackdrop,        // Modal backdrop
  modalContent,         // Modal content
  buttonSpring,         // Button spring config
} from '@/lib/animations'
```

---

## 🧩 Component Quick Start

### StatCard
```tsx
<StatCard
  label="Total Products"
  value={1247}
  Icon={Package}
  description="Active SKUs"
  variant="indigo"
  trend={{ value: '+12%', direction: 'up' }}
  onClick={() => navigate('/products')}
/>
```
**Variants:** indigo, saffron, terracotta, sage, emerald, rose

### LuxuryButton
```tsx
<LuxuryButton
  variant="primary"
  size="md"
  loading={isLoading}
  onClick={handleClick}
>
  Button Text
</LuxuryButton>
```
**Variants:** primary, secondary, accent, ghost, danger
**Sizes:** sm, md, lg

### GlassCard
```tsx
<GlassCard variant="elevated" padding="lg" hover>
  {children}
</GlassCard>
```
**Variants:** elevated, flat, bordered, glow
**Padding:** none, sm, md, lg, xl

---

## 🎯 Common Patterns

### Page Wrapper
```tsx
<motion.div
  initial="hidden"
  animate="visible"
  variants={pageTransition}
  className="space-y-8 p-8"
>
  {/* Page content */}
</motion.div>
```

### Staggered List
```tsx
<motion.div variants={staggerContainer}>
  {items.map(item => (
    <motion.div key={item.id} variants={fadeUp}>
      {/* Item content */}
    </motion.div>
  ))}
</motion.div>
```

### Interactive Card
```tsx
<motion.div
  whileHover={{ y: -4, scale: 1.01 }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
  className="group cursor-pointer"
>
  {/* Card content */}
</motion.div>
```

### Modal
```tsx
<AnimatePresence>
  {isOpen && (
    <>
      <motion.div
        variants={modalBackdrop}
        onClick={close}
        className="fixed inset-0 bg-surface-overlay backdrop-blur-md"
      />
      <motion.div variants={modalContent}>
        {/* Modal content */}
      </motion.div>
    </>
  )}
</AnimatePresence>
```

---

## 🎨 Status Badge Pattern

```tsx
const statusStyles = {
  success: 'bg-semantic-success/10 text-semantic-success border-semantic-success/30',
  warning: 'bg-semantic-warning/10 text-semantic-warning border-semantic-warning/30',
  error: 'bg-semantic-error/10 text-semantic-error border-semantic-error/30',
  info: 'bg-primary/10 text-primary border-primary/30',
}

<span className={cn(
  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
  statusStyles[status]
)}>
  {label}
</span>
```

---

## 📐 Layout Utilities

### Container
```tsx
<div className="container mx-auto px-6 py-8">
  {/* Content */}
</div>
```

### Responsive Grid
```tsx
// Stats grid
<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

// Product gallery
<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

// Two-column
<div className="grid gap-6 lg:grid-cols-2">
```

### Flex Patterns
```tsx
// Space between
<div className="flex items-center justify-between">

// Center content
<div className="flex items-center justify-center">

// Vertical stack
<div className="flex flex-col gap-4">
```

---

## 🎭 Shadow Classes

```tsx
shadow-sm              // Subtle elevation
shadow-md              // Medium elevation
shadow-lg              // High elevation
shadow-xl              // Maximum elevation
shadow-glow-indigo     // Indigo glow
shadow-glow-saffron    // Saffron glow
shadow-inner           // Inset shadow
```

---

## 🌊 Gradient Classes

```tsx
bg-gradient-luxury     // Surface gradient
bg-gradient-indigo     // Primary gradient
bg-gradient-saffron    // Accent gradient
bg-gradient-mesh       // Subtle mesh overlay
```

---

## 🎬 Transition Classes

```tsx
transition-all duration-fast     // 150ms
transition-all duration-base     // 300ms
transition-all duration-slow     // 500ms
transition-all duration-slower   // 700ms

// Easing
ease-smooth   // [0.22, 1, 0.36, 1]
ease-spring   // [0.4, 0, 0.2, 1]
ease-fabric   // [0.34, 1.2, 0.64, 1]
```

---

## 🔲 Border Radius

```tsx
rounded-sm    // 0.375rem
rounded-md    // 0.5rem
rounded-lg    // 0.75rem
rounded-xl    // 1rem
rounded-2xl   // 1.5rem
rounded-full  // 9999px
```

---

## 📱 Responsive Breakpoints

```tsx
sm:   // 640px   - Tablet
md:   // 768px   - Desktop
lg:   // 1024px  - Large desktop
xl:   // 1280px  - Extra large
2xl:  // 1536px  - Max width
```

---

## ♿ Accessibility

### Focus Ring
```tsx
focus:outline-none 
focus:ring-2 
focus:ring-primary/50 
focus:ring-offset-2 
focus:ring-offset-surface-base
```

### Reduced Motion
```tsx
import { shouldReduceMotion } from '@/lib/animations'

const variants = shouldReduceMotion() ? {} : fadeUp
```

### Screen Reader
```tsx
<span className="sr-only">Screen reader text</span>
```

---

## 🎨 Icon Guidelines

### Icon Size Classes
```tsx
h-4 w-4   // Small (buttons, badges)
h-5 w-5   // Medium (cards, list items)
h-6 w-6   // Large (headings)
h-8 w-8   // XL (empty states)
```

### Icon Colors
```tsx
text-text-primary      // Default
text-text-secondary    // Muted
text-primary           // Accent
text-accent-saffron    // Warm accent
text-semantic-success  // Success
text-semantic-error    // Error
```

---

## 🚦 Loading States

### Spinner
```tsx
<motion.div
  animate={{ rotate: 360 }}
  transition={{ duration: 1, ease: 'linear', repeat: Infinity }}
  className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent"
/>
```

### Skeleton
```tsx
<div className="animate-pulse space-y-3">
  <div className="h-4 bg-surface-elevated rounded w-3/4" />
  <div className="h-4 bg-surface-elevated rounded w-1/2" />
</div>
```

---

## 🎯 Empty States

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="mb-4 rounded-full bg-surface-card p-4">
    <Icon className="h-8 w-8 text-text-muted" />
  </div>
  <h3 className="mb-2 font-heading text-xl font-bold text-text-primary">
    No items found
  </h3>
  <p className="text-text-secondary">
    Description text
  </p>
</div>
```

---

## 🧪 Testing Checklist

```tsx
// Visual regression
- [ ] Desktop (1920x1080)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

// Interactions
- [ ] Hover states
- [ ] Focus states
- [ ] Click/tap feedback
- [ ] Loading states
- [ ] Error states

// Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader
- [ ] Color contrast
- [ ] Reduced motion
```

---

## 💾 Copy-Paste Snippets

### Import Block
```tsx
import { motion, AnimatePresence } from 'framer-motion'
import { StatCard } from '@/components/ui/StatCard'
import { LuxuryButton } from '@/components/ui/LuxuryButton'
import { GlassCard } from '@/components/ui/GlassCard'
import { pageTransition, staggerContainer, fadeUp } from '@/lib/animations'
import { cn } from '@/lib/utils'
```

### Page Template
```tsx
export default function MyPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={pageTransition}
      className="space-y-8 p-8"
    >
      <div>
        <h1 className="font-heading text-4xl font-bold tracking-tight text-text-primary mb-2">
          Page Title
        </h1>
        <p className="text-text-secondary">
          Description text
        </p>
      </div>

      {/* Content */}
    </motion.div>
  )
}
```

---

## 🔗 Quick Links

- **Design Tokens:** `design-tokens/theme.json`
- **Tailwind Config:** `tailwind.config.ts`
- **Animations:** `src/lib/animations.ts`
- **Components:** `src/components/ui/`
- **Full Guide:** `PREMIUM_UI_IMPLEMENTATION_GUIDE.md`

---

**Pro Tip:** Keep this card open while coding for quick reference! 🚀
