"use client";

import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";

export default function CreateSession() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const createSession = async () => {
    if (loading) return; // 🔒 prevent double click

    try {
      setLoading(true);
      setMessage("");

      // 🔐 GET USER
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData?.user) {
        setMessage("❌ Please login first");
        return;
      }

      const userId = userData.user.id;

      // 👤 CHECK PROFILE
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError || !profile) {
        setMessage("❌ Profile not found");
        return;
      }

      // 🚫 ROLE CHECK
      if (profile.role !== "mentor") {
        setMessage("❌ Only mentors can create sessions");
        return;
      }

      // 🆔 GENERATE SESSION ID
      const sessionId = uuidv4();

      // 🆕 CREATE SESSION
      const { data, error } = await supabase
        .from("sessions")
        .insert([
          {
            //  id: sessionId,// ✅ custom UUID
            mentor_id: userId,
            // status: "waiting", // optional but useful
            // created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error || !data) {
        console.error("Insert error:", error);
        setMessage("❌ Failed to create session");
        return;
      }

      // ✅ SUCCESS
      setMessage(`✅ Session created! ID: ${data.id}`);

      // 🚀 REDIRECT
      setTimeout(() => {
        router.push(`/session/${sessionId}`);
      }, 800);
    } catch (err) {
      console.error("Unexpected error:", err);
      setMessage("❌ Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-6">
      
      {/* TITLE */}
      <h1 className="text-3xl font-bold">
        🚀 Create Session
      </h1>

      {/* BUTTON */}
      <button
        onClick={createSession}
        disabled={loading}
        className={`px-6 py-3 rounded-xl transition ${
          loading
            ? "bg-gray-500 cursor-not-allowed"
            : "bg-green-500 hover:bg-green-600"
        }`}
      >
        {loading ? "Creating..." : "Create Session"}
      </button>

      {/* MESSAGE */}
    {message && (
  <div className="flex flex-col items-center gap-2">
    <p className="text-sm text-center">{message}</p>

    {/* ✅ COPY BUTTON */}
    <button
      onClick={() => {
        const id = message.split("ID: ")[1];
        if (id) navigator.clipboard.writeText(id);
      }}
      className="bg-gray-700 px-3 py-1 rounded hover:bg-gray-600"
    >
      Copy ID
    </button>
  </div>
)}
    </div>
  );
}