import "next-auth";

declare module "next-auth" {
  interface User {
    id?: string;
    goal?: string;
    role?: string;
  }

  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      goal?: string;
      role?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    goal?: string;
    role?: string;
  }
}
