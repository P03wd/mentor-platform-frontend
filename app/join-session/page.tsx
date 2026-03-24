"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinSession() {
  const [sessionId, setSessionId] = useState("");
  const router = useRouter();

  const joinSession = () => {
    if (!sessionId.trim()) {
      alert("Enter session ID");
      return;
    }

    router.push(`/session/${sessionId}`);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-6">
      
      <h1 className="text-3xl font-bold">
        🎯 Join Session
      </h1>

      <input
        type="text"
        placeholder="Enter Session ID"
        value={sessionId}
        onChange={(e) => setSessionId(e.target.value)}
        className="p-3 rounded bg-gray-800 w-80 outline-none"
      />

      <button
        onClick={joinSession}
        className="bg-blue-500 px-6 py-3 rounded hover:bg-blue-600"
      >
        Join
      </button>
    </div>
  );
}