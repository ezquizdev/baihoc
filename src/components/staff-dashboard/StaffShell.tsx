"use client";

import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  type StaffNavKey,
  staffNavItems,
} from "@/components/staff-dashboard/staff-nav";

type StaffShellProps = {
  children: ReactNode;
  activeNav: StaffNavKey;
  pageTitle?: string;
  userEmail: string;
  userName?: string;
  avatarUrl?: string | null;
  searchValue?: string;
  searchPlaceholder?: string;
  searchName?: string;
  searchDisabled?: boolean;
  hideSearch?: boolean;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: (value: string) => void;
};

export function StaffShell({
  children,
  pageTitle,
  activeNav,
  userEmail,
  userName,
  avatarUrl,
  searchValue,
  searchPlaceholder,
  searchName,
  searchDisabled,
  hideSearch,
  onSearchChange,
  onSearchSubmit,
}: StaffShellProps) {
  return (
    <DashboardShell
      pageTitle={pageTitle}
      activeNav={activeNav}
      userEmail={userEmail}
      userName={userName}
      avatarUrl={avatarUrl}
      navItems={staffNavItems}
      searchValue={searchValue}
      searchPlaceholder={searchPlaceholder}
      searchName={searchName}
      searchDisabled={searchDisabled}
      hideSearch={hideSearch}
      onSearchChange={onSearchChange}
      onSearchSubmit={onSearchSubmit}
    >
      {children}
    </DashboardShell>
  );
}
