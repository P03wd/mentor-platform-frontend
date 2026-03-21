"use client";

import Editor from "@monaco-editor/react";
import { socket } from "../lib/socket";

export default function CodeEditor({ sessionId }: any) {

  const handleChange = (value: any) => {
    socket.emit("code-change", { sessionId, code: value });
  };

  socket.on("code-update", (code) => {
    console.log("Updated:", code);
  });

  return (
    <Editor
      height="400px"
      defaultLanguage="javascript"
      onChange={handleChange}
    />
  );
}