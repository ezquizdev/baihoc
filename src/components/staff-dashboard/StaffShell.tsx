"use client";

import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  type StaffNavKey,
  staffNavItems,
} from "@/components/staff-dashboard/staff-nav";

type StaffShellProps = {
  children: ReactNode;
  pageTitle: string;
  activeNav: StaffNavKey;
  userEmail: string;
  userName?: string;
  avatarUrl?: string | null;
};

export function StaffShell({
  children,
  pageTitle,
  activeNav,
  userEmail,
  userName,
  avatarUrl,
}: StaffShellProps) {
  return (
    <DashboardShell
      pageTitle={pageTitle}
      activeNav={activeNav}
      userEmail={userEmail}
      userName={userName}
      avatarUrl={avatarUrl}
      navItems={staffNavItems}
    >
      {children}
    </DashboardShell>
  );
}
