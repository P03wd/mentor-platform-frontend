"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useParams } from "next/navigation";
import Editor from "@monaco-editor/react";

export default function SessionPage() {
  const { id } = useParams();

  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const callerRef = useRef(false);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [code, setCode] = useState("// Start coding...");

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const [status, setStatus] = useState("Connecting...");

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  // 🔄 RECONNECT LOGIC
  const connectSocket = () => {
    const socket = io("https://mentor-platform-backend.onrender.com", {
      transports: ["websocket"],
      reconnection: true,
    });

    socketRef.current = socket;

    socket.emit("join-session", id);

    socket.on("role", (role: string) => {
      callerRef.current = role === "caller";
      console.log("Role:", role);
    });

    socket.on("ready", async () => {
      if (!peerRef.current) return;
      if (!callerRef.current) return;

      const offer = await peerRef.current.createOffer();
      await peerRef.current.setLocalDescription(offer);

      socket.emit("offer", { sessionId: id, offer });
    });

    socket.on("offer", async (offer) => {
      const peer = peerRef.current;
      if (!peer) return;

      await peer.setRemoteDescription(offer);

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socket.emit("answer", { sessionId: id, answer });
    });

    socket.on("answer", async (answer) => {
      await peerRef.current?.setRemoteDescription(answer);
      setStatus("Connected ✅");
    });

    socket.on("ice-candidate", async (candidate) => {
      await peerRef.current?.addIceCandidate(candidate);
    });

    socket.on("receive-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("receive-code", (newCode) => {
      setCode(newCode);
    });

    // 🔌 HANDLE DISCONNECT + AUTO RECONNECT
    socket.on("disconnect", () => {
      setStatus("Disconnected ❌ Reconnecting...");
    });

    socket.on("connect", () => {
      setStatus("Reconnected ✅");
    });
  };

  useEffect(() => {
    if (!id) return;

    connectSocket();

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
          ],
        });

        peerRef.current = peer;

        stream.getTracks().forEach((track) => {
          peer.addTrack(track, stream);
        });

        peer.ontrack = (event) => {
          setRemoteStream(event.streams[0]);
        };

        peer.onicecandidate = (event) => {
          if (event.candidate) {
            socketRef.current?.emit("ice-candidate", {
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

    return () => {
      socketRef.current?.disconnect();
      peerRef.current?.close();
    };
  }, [id]);

  // 💬 SEND MESSAGE
  const sendMessage = () => {
    if (!message.trim()) return;

    socketRef.current?.emit("send-message", {
      sessionId: id,
      message,
    });

    setMessages((prev) => [...prev, "You: " + message]);
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

  // 🎤 MUTE / UNMUTE
  const toggleMute = () => {
    if (!localStream) return;

    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });

    setIsMuted((prev) => !prev);
  };

  // 📷 CAMERA ON/OFF
  const toggleCamera = () => {
    if (!localStream) return;

    localStream.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });

    setIsCameraOff((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold">🚀 Session {id}</h1>
      <p className="text-sm text-gray-400 mb-4">{status}</p>

      {/* 🎥 VIDEO */}
      <div className="flex gap-4 mb-4">
        <video
          autoPlay
          playsInline
          muted
          ref={(v) => {
            if (v && localStream) v.srcObject = localStream;
          }}
          className="w-60 rounded-lg border"
        />

        <video
          autoPlay
          playsInline
          ref={(v) => {
            if (v && remoteStream) v.srcObject = remoteStream;
          }}
          className="w-60 rounded-lg border"
        />
      </div>

      {/* 🎛 CONTROLS */}
      <div className="flex gap-2 mb-4">
        <button onClick={toggleMute} className="bg-yellow-500 px-3 py-1 rounded">
          {isMuted ? "Unmute" : "Mute"}
        </button>

        <button onClick={toggleCamera} className="bg-red-500 px-3 py-1 rounded">
          {isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
        </button>
      </div>

      {/* 💻 CODE */}
      <div className="mb-4">
        <Editor
          height="250px"
          defaultLanguage="javascript"
          value={code}
          onChange={handleCodeChange}
        />
      </div>

      {/* 💬 CHAT */}
      <div className="bg-gray-800 p-3 rounded">
        <div className="h-32 overflow-y-auto mb-2">
          {messages.map((msg, i) => (
            <p key={i}>{msg}</p>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            className="flex-1 p-2 bg-gray-700"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type..."
          />

          <button onClick={sendMessage} className="bg-blue-500 px-3 rounded">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}