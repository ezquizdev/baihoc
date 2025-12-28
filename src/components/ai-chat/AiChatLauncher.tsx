"use client";

import { usePathname } from "next/navigation";
import { ChatCircleDots, X } from "phosphor-react";
import { useMemo, useState } from "react";
import { AiChatDialog } from "./AiChatDialog";
import styles from "./ai-chat.module.css";

function shouldHideOnPath(pathname: string) {
  return (
    pathname.startsWith("/auth") ||
    pathname === "/logout" ||
    pathname.startsWith("/staff")
  );
}

export function AiChatLauncher() {
  const pathname = usePathname();
  const hidden = useMemo(() => shouldHideOnPath(pathname), [pathname]);
  const [open, setOpen] = useState(false);

  if (hidden) return null;

  return (
    <div className={styles.launcher}>
      {open ? <AiChatDialog onClose={() => setOpen(false)} /> : null}
      <button
        type="button"
        className={styles.bubbleButton}
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Đóng trợ lý AI" : "Mở trợ lý AI"}
        aria-expanded={open}
      >
        {open ? <X size={22} weight="bold" /> : <ChatCircleDots size={24} />}
      </button>
    </div>
  );
}
