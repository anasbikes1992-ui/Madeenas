import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: string
      locationId: string | null
      locationName: string | null
    }
  }
  interface User {
    role: string
    locationId?: string | null
    locationName?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    locationId?: string | null
    locationName?: string | null
  }
}
