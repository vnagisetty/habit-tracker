import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile",
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
        session.user.email = token.email ?? session.user.email
        session.user.name = token.name ?? session.user.name
        session.user.image = (token.picture as string | null) ?? session.user.image
      }
      return session
    },
    async jwt({ token, profile }) {
      if (profile) {
        token.email = profile.email
        token.name = profile.name
        token.picture = (profile as { picture?: string }).picture ?? null
      }
      return token
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
}
