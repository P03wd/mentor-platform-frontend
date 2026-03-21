"use client";

import { useState, useEffect } from "react";
import { socket } from "../lib/socket";

export default function Chat({ sessionId }: any) {

  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState<string[]>([]);

  const sendMessage = () => {
    socket.emit("send-message", { sessionId, message: msg });
    setMsg("");
  };

  useEffect(() => {
    socket.on("receive-message", (message) => {
      setMessages(prev => [...prev, message]);
    });
  }, []);

  return (
    <div>
      {messages.map((m, i) => <p key={i}>{m}</p>)}

      <input value={msg} onChange={(e) => setMsg(e.target.value)} />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}