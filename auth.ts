import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import { compareSync } from "bcrypt-ts-edge";
import type { NextAuthConfig } from "next-auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const config = {
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // makes the session last 30 days
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },

      async authorize(credentials) {
        if (credentials == null) return null;

        // Find the user in database
        const user = await prisma.user.findFirst({
          where: {
            email: credentials.email as string,
          },
        });

        // Check if the user exists and the password matches
        if (user && user.password) {
          const isMatch = compareSync(
            credentials.password as string,
            user.password
          );

          // If password is correct, return user
          if (isMatch) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            };
          }
        }
        // If user does not exist or password does not match then return null
        return null;
      },
    }),
  ],

  // Callbacks are gonna run at certain times, say if we want to do something when the user signs in
  // We are gonna use the session callback which runs when the session is accessed
  // trigger is the reason why this callback ran, trigger may be sign in, or an update or whatever
  callbacks: {
    async session({ session, user, trigger, token }: any) {
      // Set the user ID as the subject from the token
      session.user.id = token.sub; // Token subject
      session.user.role = token.role;
      session.user.name = token.name;
      console.log("this is the token", token, session);
      // If there is an update, set the user name
      if (trigger === "update") {
        session.user.name = user.name;
      }
      return session;
    },

    async jwt({ session, user, trigger, token }: any) {
      // Assign user fields to token
      if (user) {
        token.role = user.role;
        if (user.name === "NO_NAME") {
          token.name = user.email!.split("@")[0];
          // Update database to reflect the token name
          await prisma.user.update({
            where: { id: user.id },
            data: { name: token.name },
          });
        }
      }
      return token;
    },
    authorized({ request, auth }: any) {
      // Check for session cart cookie
      if (!request.cookies.get("sessionCartId")) {
        // Generate new session cart id cookie
        const sessionCartId = crypto.randomUUID();
        console.log("sessionCartId", sessionCartId);
        // Clone the request headers
        const newRequestHeaders = new Headers(request.headers);

        // Create new response and add the headers
        const response = NextResponse.next({
          request: {
            headers: newRequestHeaders,
          },
        });

        // Set newly generated sessionCartId to the response cookie
        response.cookies.set("sessionCartId", sessionCartId);
        return response;
      } else {
        return true;
      }
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);

// handlers is an object that contains the HTTP handlers for the different endpoints that next auth uses
// we will be using these handlers to create the next auth API routes

// Auth is a function that will get the session and check if the user is logged in or not

// signIn is a function used to sign in with a provider if no provider is specified then the user will be redirected to the sign in page

// signOut is going to sign out the user and invalidate the cookie
