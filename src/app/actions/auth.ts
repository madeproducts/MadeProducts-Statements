"use server";

import { createClient } from "@/lib/supabase/server";
import db from "@/lib/db";
import { Role } from "@prisma/client";
import { z } from "zod";
import { cookies } from "next/headers";

const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  role: z.nativeEnum(Role).optional(),
});

export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const validation = authSchema.safeParse({ email, password });
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data.user) {
      const profile = await db.userProfile.findUnique({
        where: { id: data.user.id },
      });

      if (!profile) {
        const userCount = await db.userProfile.count();
        const role = userCount === 0 ? Role.ADMIN : Role.STAFF;
        
        await db.userProfile.create({
          data: {
            id: data.user.id,
            email: data.user.email!,
            name: email.split("@")[0],
            role,
          },
        });
      }
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: "An unexpected error occurred during login." };
  }
}

export async function signupAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;
  const selectedRole = formData.get("role") as string;

  const validation = authSchema.safeParse({ email, password, name, role: selectedRole as Role });
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data.user) {
      // Create user profile in the database
      const userCount = await db.userProfile.count();
      const role = userCount === 0 ? Role.ADMIN : (selectedRole as Role || Role.STAFF);

      await db.userProfile.create({
        data: {
          id: data.user.id,
          email: data.user.email!,
          name: name || email.split("@")[0],
          role,
        },
      });
    }

    return { success: true, message: "Registration successful! Please check your email for confirmation." };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, error: "A profile with this email already exists." };
    }
    return { success: false, error: "An unexpected error occurred during signup." };
  }
}

export async function logoutAction() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return { success: true };
  } catch (error) {
    return { success: false, error: "Logout failed" };
  }
}
