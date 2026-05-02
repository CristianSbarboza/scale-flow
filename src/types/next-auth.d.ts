import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "leader" | "servant";
    } & DefaultSession["user"];
  }

  interface User {
    role: "admin" | "leader" | "servant";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "admin" | "leader" | "servant";
  }
}
