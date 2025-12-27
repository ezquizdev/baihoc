"use client";

import { useState } from "react";
import ChatWidget from "./ChatWidget";

export default function ChatBubble() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-50">

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="rounded-full w-16 h-16 bg-blue-600 shadow-2xl text-white text-sm font-semibold"
        >
          Chat AI
        </button>
      )}

      {open && <ChatWidget onClose={() => setOpen(false)} />}
    </div>
  );
}
