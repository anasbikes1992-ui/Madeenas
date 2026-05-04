import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { authConfig } from '@/lib/auth.config'

const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
          console.error('[auth] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
          // Return null instead of throwing to avoid Configuration error
          return null
        }
      },
    }),
  ],
})
