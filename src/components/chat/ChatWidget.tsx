"use client";

import { useState } from "react";

type Props = {
  onClose: () => void;
};

export default function ChatWidget({ onClose }: Props) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { from: "user" | "bot"; text: string }[]
  >([]);

  async function sendMessage() {
    if (!input.trim()) return;

    const msg = input;
    setMessages((m) => [...m, { from: "user", text: msg }]);
    setInput("");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg }),
    });

    const data = await res.json();
    setMessages((m) => [...m, { from: "bot", text: data.reply }]);
  }

  return (
    <div className="w-96 h-[420px] bg-white rounded-2xl shadow-2xl flex flex-col border text-base text-black">

      {/* Header */}
      <div className="p-3 border-b flex justify-between items-center">
        <span className="font-bold text-lg">BaiLearn Assistant</span>
        <button onClick={onClose} className="font-bold text-lg">✕</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-slate-100">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`p-3 rounded-xl max-w-[80%] font-semibold leading-relaxed ${
              m.from === "user"
                ? "bg-blue-600 text-white ml-auto"
                : "bg-white border border-gray-300 text-black"
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t flex gap-2 bg-white">
        <input
          className="flex-1 border border-gray-400 rounded-xl px-3 py-2 text-black font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Nhập câu hỏi…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              sendMessage();
            }
          }}
        />

        <button
          className="px-4 rounded-xl bg-blue-600 text-white font-bold"
          onClick={sendMessage}
        >
          Gửi
        </button>
      </div>
    </div>
  );
}
