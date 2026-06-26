import type { NextAuthConfig } from 'next-auth'

/**
 * Edge-safe auth config — no Node.js-only imports (no bcrypt, no Prisma).
 * Used by middleware. The full auth.ts extends this with providers.
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as {
          role?: string
          locationId?: string | null
          locationName?: string | null
          permissions?: string[]
          useCustomPermissions?: boolean
        }
        token.role = u.role
        token.locationId = u.locationId
        token.locationName = u.locationName
        token.permissions = u.permissions || []
        token.useCustomPermissions = u.useCustomPermissions || false
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub as string
        session.user.role = token.role as string
        session.user.locationId = token.locationId as string | null
        session.user.locationName = token.locationName as string | null
        session.user.permissions = token.permissions as string[]
        session.user.useCustomPermissions = token.useCustomPermissions as boolean
      }
      return session
    },
  },
  providers: [],
  session: { strategy: 'jwt' },
  trustHost: true,
}
