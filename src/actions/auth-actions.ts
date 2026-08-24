"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { executeSecureAction, ActionResponse } from "@/lib/actions-utils";
import { z } from "zod";

const AuthSchema = z.object({
  email: z.string().email("Invalid email format").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(100, "Password is too long")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export async function signUpUser(
  emailRaw: string,
  passwordRaw: string
): Promise<ActionResponse<{ id: string; email: string }>> {
  return executeSecureAction(async () => {
    // 1. Validate credentials against schemas
    const parsed = AuthSchema.parse({ email: emailRaw, password: passwordRaw });

    const email = parsed.email.toLowerCase().trim();

    // 2. Check duplicate registration
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error("A user already exists with this email address");
    }

    // 3. Encrypt password using bcrypt
    const passwordHash = await bcrypt.hash(parsed.password, 12); // Hardened salt rounds to 12

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: email.split("@")[0],
      }
    });

    return { id: user.id, email: user.email };
  });
}
