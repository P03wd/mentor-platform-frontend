"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useParams } from "next/navigation";
import Editor from "@monaco-editor/react";

export default function SessionPage() {
  const { id } = useParams();

  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [code, setCode] = useState("// Start coding...");

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const [status, setStatus] = useState("Connecting...");

  useEffect(() => {
    if (!id) return;

    const socket = io("https://mentor-platform-backend.onrender.com", {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    let caller = false; // 🔥 IMPORTANT

    socket.emit("join-session", id);

    // 🎭 ROLE
    socket.on("role", (role: string) => {
      caller = role === "caller";
      console.log("Role:", role);
    });

    // 🚀 READY → Caller creates offer
    socket.on("ready", async () => {
      if (!peerRef.current) return;
      if (!caller) return;

      console.log("Creating offer...");

      const offer = await peerRef.current.createOffer();
      await peerRef.current.setLocalDescription(offer);

      socket.emit("offer", { sessionId: id, offer });
    });

    // 📩 OFFER
    socket.on("offer", async (offer) => {
      const peer = peerRef.current;
      if (!peer) return;

      console.log("Received offer");

      await peer.setRemoteDescription(offer);

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socket.emit("answer", { sessionId: id, answer });
    });

    // 📩 ANSWER
    socket.on("answer", async (answer) => {
      console.log("Received answer");

      await peerRef.current?.setRemoteDescription(answer);
      setStatus("Connected ✅");
    });

    // ❄ ICE
    socket.on("ice-candidate", async (candidate) => {
      await peerRef.current?.addIceCandidate(candidate);
    });

    // 💬 CHAT
    socket.on("receive-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // 💻 CODE
    socket.on("receive-code", (newCode) => {
      setCode(newCode);
    });

    // 🎥 START MEDIA + PEER
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        setLocalStream(stream);

        const peer = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            {
              urls: "turn:openrelay.metered.ca:80",
              username: "openrelayproject",
              credential: "openrelayproject",
            },
          ],
        });

        peerRef.current = peer;

        // 🎯 ADD TRACKS
        stream.getTracks().forEach((track) => {
          peer.addTrack(track, stream);
        });

        // 🎥 RECEIVE REMOTE VIDEO
        peer.ontrack = (event) => {
          console.log("Remote stream received");
          setRemoteStream(event.streams[0]);
        };

        // ❄ ICE
        peer.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("ice-candidate", {
              sessionId: id,
              candidate: event.candidate,
            });
          }
        };

        setStatus("Waiting for peer...");
      } catch (err) {
        console.error(err);
        setStatus("❌ Camera/Mic error");
      }
    };

    start();

    // 🧹 CLEANUP
    return () => {
      socket.disconnect();
      peerRef.current?.close();

      // stop camera
      localStream?.getTracks().forEach((track) => track.stop());
    };
  }, [id]);

  // 💬 SEND MESSAGE
  const sendMessage = () => {
    if (!message.trim()) return;

    socketRef.current?.emit("send-message", {
      sessionId: id,
      message: "User: " + message,
    });

    setMessage("");
  };

  // 💻 CODE CHANGE
  const handleCodeChange = (value: string | undefined) => {
    if (!value) return;

    setCode(value);

    socketRef.current?.emit("code-change", {
      sessionId: id,
      code: value,
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-2">
        🚀 Session {id}
      </h1>

      <p className="text-sm text-gray-400 mb-6">{status}</p>

      {/* 🎥 VIDEO */}
      <div className="flex gap-6 mb-6">
        <video
          autoPlay
          playsInline
          muted
          ref={(video) => {
            if (video && localStream) video.srcObject = localStream;
          }}
          className="w-64 rounded-xl border border-gray-700"
        />

        <video
          autoPlay
          playsInline
          ref={(video) => {
            if (video && remoteStream) video.srcObject = remoteStream;
          }}
          className="w-64 rounded-xl border border-gray-700"
        />
      </div>

      {/* 💻 CODE */}
      <div className="mb-6">
        <Editor
          height="300px"
          defaultLanguage="javascript"
          value={code}
          onChange={handleCodeChange}
        />
      </div>

      {/* 💬 CHAT */}
      <div className="bg-gray-800 p-4 rounded-xl">
        <div className="h-40 overflow-y-auto mb-3">
          {messages.map((msg, i) => (
            <p key={i}>{msg}</p>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            className="flex-1 p-2 bg-gray-700"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type message..."
          />

          <button
            onClick={sendMessage}
            className="bg-blue-500 px-4 rounded"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}