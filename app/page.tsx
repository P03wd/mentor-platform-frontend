"use client";

import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import Link from "next/link";

export default function Home() {

  useEffect(() => {
    const createProfile = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (!data.user) {
        console.log("No user logged in");
        return;
      }

      console.log("User found:", data.user.id);

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: data.user.id,
          email: data.user.email,
          role: "mentor", // default role
        });

      if (profileError) {
        console.log("Profile error:", profileError.message);
      } else {
        console.log("Profile created/updated successfully");
      }
    };

    createProfile();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Mentor Platform 🚀</h1>

      <br />

      <Link href="/login">Login</Link>

      <br /><br />

      <Link href="/create-session">Create Session</Link>
    </div>
  );
}