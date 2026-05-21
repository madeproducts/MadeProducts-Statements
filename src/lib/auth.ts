import { createClient } from "@/lib/supabase/server";
import db from "@/lib/db";
import { Role } from "@prisma/client";

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}


export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const profile = await db.userProfile.findUnique({
      where: { id: user.id },
    });

    if (!profile) {
      // Fallback: If profile isn't in database yet, return a temporary one based on auth email
      return {
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.name || user.email!.split("@")[0],
        role: Role.STAFF, // Safe default
      };
    }

    return profile;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}
