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

  const [isCaller, setIsCaller] = useState(false);

  useEffect(() => {
    // 🔌 CONNECT SOCKET (FIXED)
    socketRef.current = io("https://mentor-platform-backend.onrender.com", {
      transports: ["websocket"],
    });

    const socket = socketRef.current;

    socket.emit("join-session", id);

    // ✅ GET ROLE FROM SERVER
    socket.on("role", (role: string) => {
      console.log("My role:", role);
      setIsCaller(role === "caller");
    });

    // 🧹 CLEAN OLD PEER
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }

    const start = async () => {
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

      // ADD TRACKS
      stream.getTracks().forEach((track) => {
        peer.addTrack(track, stream);
      });

      // RECEIVE VIDEO
      peer.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      // ICE
      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", {
            sessionId: id,
            candidate: event.candidate,
          });
        }
      };

      // 🔥 WAIT UNTIL BOTH USERS READY
      socket.on("ready", async () => {
        if (!peerRef.current) return;
        if (!isCaller) return;

        const offer = await peerRef.current.createOffer();
        await peerRef.current.setLocalDescription(offer);

        socket.emit("offer", {
          sessionId: id,
          offer,
        });
      });
    };

    start();

    // 📩 OFFER
    socket.on("offer", async (offer) => {
      const peer = peerRef.current;
      if (!peer) return;

      await peer.setRemoteDescription(offer);

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socket.emit("answer", {
        sessionId: id,
        answer,
      });
    });

    // 📩 ANSWER
    socket.on("answer", async (answer) => {
      await peerRef.current?.setRemoteDescription(answer);
    });

    // 📩 ICE
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

    // 🧹 CLEANUP
    return () => {
      socket.disconnect();
      peerRef.current?.close();
    };
  }, [id, isCaller]);

  // 💬 SEND MESSAGE
  const sendMessage = () => {
    if (!message) return;

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
      {/* HEADER */}
      <h1 className="text-3xl font-bold mb-6">
        🚀 Session {id}
      </h1>

      {/* VIDEO */}
      <div className="flex gap-6 mb-6">
        <div>
          <p className="text-sm text-gray-400 mb-2">You</p>
          <video
            autoPlay
            playsInline
            muted
            ref={(video) => {
              if (video && localStream) video.srcObject = localStream;
            }}
            className="w-64 rounded-xl border border-gray-700"
          />
        </div>

        <div>
          <p className="text-sm text-gray-400 mb-2">Peer</p>
          <video
            key="remote"
            autoPlay
            playsInline
            ref={(video) => {
              if (video && remoteStream) video.srcObject = remoteStream;
            }}
            className="w-64 rounded-xl border border-gray-700"
          />
        </div>
      </div>

      {/* CODE EDITOR */}
      <div className="mb-6">
        <h2 className="text-xl mb-2">💻 Code Editor</h2>
        <div className="rounded-lg overflow-hidden border border-gray-700">
          <Editor
            height="300px"
            defaultLanguage="javascript"
            value={code}
            onChange={handleCodeChange}
          />
        </div>
      </div>

      {/* CHAT */}
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
        <h2 className="text-xl mb-3">💬 Chat</h2>

        <div className="h-40 overflow-y-auto mb-3 space-y-1">
          {messages.map((msg, index) => (
            <p key={index} className="text-sm">
              {msg}
            </p>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            className="flex-1 p-2 rounded bg-gray-700 outline-none"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type message..."
          />

          <button
            onClick={sendMessage}
            className="bg-blue-500 px-4 rounded hover:bg-blue-600"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}