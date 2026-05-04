import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
if (!secret) {
  throw new Error('[auth] Missing AUTH_SECRET (or NEXTAUTH_SECRET). Authentication cannot start.')
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
            include: { location: true },
          })
          if (!user || !user.isActive) return null

          const valid = await bcrypt.compare(credentials.password as string, user.password)
          if (!valid) return null

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            locationId: user.locationId,
            locationName: user.location?.name,
          }
        } catch (error) {
          console.error('[auth] Credentials authorize() failed:', error)
          throw new Error('Authentication backend unavailable')
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const sessionUser = user as {
          role?: string
          locationId?: string | null
          locationName?: string | null
        }

        token.role = sessionUser.role
        token.locationId = sessionUser.locationId
        token.locationName = sessionUser.locationName
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub as string
        session.user.role = token.role as string
        session.user.locationId = token.locationId as string | null
        session.user.locationName = token.locationName as string | null
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt' },
  trustHost: true,
})
