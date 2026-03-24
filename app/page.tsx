"use client";

import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import Link from "next/link";

export default function Home() {
  useEffect(() => {
    const createProfile = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("Auth error:", error.message);
        return;
      }

      if (!user) {
        console.log("No user logged in");
        return;
      }

      console.log("User found:", user.id);

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email,
            role: "mentor",
          },
          { onConflict: "id" } // ✅ important
        );

      if (profileError) {
        console.log("Profile error:", profileError.message);
      } else {
        console.log("Profile created/updated successfully");
      }
    };

    createProfile();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Mentor Platform 🚀</h1>

      <div className="mt-4 flex flex-col gap-2">
        <Link href="/login" className="text-blue-400 underline">
          Login
        </Link>

        <Link href="/create-session" className="text-blue-400 underline">
          Create Session
        </Link>
      </div>
    </div>
  );
}