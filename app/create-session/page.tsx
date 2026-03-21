"use client";

import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function CreateSession() {
  const router = useRouter();

  const createSession = async () => {
    console.log("Clicked create session");

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    console.log("User:", userData, userError);

    if (!userData?.user) {
      alert("Login first");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userData.user.id)
      .single();

    console.log("Profile:", profile, profileError);

    if (!profile) {
      alert("Profile not found");
      return;
    }

    if (profile.role !== "mentor") {
      alert("Only mentors can create sessions");
      return;
    }

    const { data, error } = await supabase
      .from("sessions")
      .insert([
        {
          mentor_id: userData.user.id,
        },
      ])
      .select()
      .single();

    console.log("Session:", data, error);

    if (error) {
      alert("Error creating session");
      return;
    }

    if (data) {
      router.push(`/session/${data.id}`);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Create Session</h1>

      <button onClick={createSession}>
        Create Session
      </button>
    </div>
  );
}