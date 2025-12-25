"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, MagnifyingGlass } from "phosphor-react";
import type { FormEvent, MouseEvent, ReactNode } from "react";
import styles from "./dashboard-shell.module.css";

type NavItem = {
  key: string;
  label: string;
  href?: string;
};

type DashboardShellProps = {
  children: ReactNode;
  pageTitle?: string;
  activeNav?: string;
  userEmail: string;
  userName?: string;
  navItems?: NavItem[];
  avatarUrl?: string | null;
  searchValue?: string;
  searchPlaceholder?: string;
  searchName?: string;
  searchDisabled?: boolean;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: (value: string) => void;
};

const defaultNav: NavItem[] = [
  { key: "overview", label: "Tổng quan", href: "/dashboard" },
  { key: "quizzes", label: "Tất cả bài trắc nghiệm", href: "/quizzes" },
  { key: "history", label: "Lịch sử" },
  { key: "leaderboard", label: "Bảng xếp hạng" },
  { key: "settings", label: "Cài đặt", href: "/profile" },
];

export function DashboardShell({
  children,
  pageTitle,
  activeNav = "overview",
  userEmail,
  userName,
  navItems = defaultNav,
  avatarUrl,
  searchValue,
  searchPlaceholder = "Tìm kiếm",
  searchName = "q",
  searchDisabled = false,
  onSearchChange,
  onSearchSubmit,
}: DashboardShellProps) {
  const router = useRouter();
  const displayName = userName ?? userEmail.split("@")[0];
  const toggleId = "dashboard-nav-toggle";
  const handlePlaceholderClick = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
  };
  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onSearchSubmit) return;
    const formData = new FormData(event.currentTarget);
    const value = String(formData.get(searchName) ?? "");
    onSearchSubmit(value);
  };
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors and still proceed to login screen.
    }
    router.replace("/auth/login");
    router.refresh();
  };
  const inputProps =
    searchValue !== undefined ? { value: searchValue } : undefined;

  return (
    <div className={styles.shell}>
      <input className={styles.navToggle} type="checkbox" id={toggleId} />
      <label
        className={styles.overlay}
        htmlFor={toggleId}
        aria-label="Đóng menu"
      />

      <div className={styles.app}>
        <aside className={styles.sidebar} aria-label="Thanh bên">
          <div className={styles.brand}>
            <Image
              src="/assets/logo.svg"
              alt="BaiHoc"
              width={34}
              height={34}
              className={styles.brandLogo}
              priority
            />
            <div>
              <div className={styles.brandName}>BaiHoc</div>
              <div className={styles.brandSub}>Bảng điều khiển</div>
            </div>
          </div>

          <nav className={styles.nav} aria-label="Trình đơn">
            {navItems.map((item) => {
              const isActive = activeNav === item.key;
              const linkClass = [
                styles.navLink,
                isActive ? styles.navLinkActive : "",
              ]
                .filter(Boolean)
                .join(" ");

              if (!item.href) {
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={linkClass}
                    onClick={handlePlaceholderClick}
                    aria-disabled="true"
                  >
                    <span className={styles.dot} aria-hidden="true" />
                    {item.label}
                  </button>
                );
              }

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={linkClass}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className={styles.dot} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <section className={styles.support} aria-label="Thẻ hỗ trợ">
            <h4 className={styles.supportTitle}>Liên hệ hỗ trợ</h4>
            <p className={styles.supportText}>
              Chúng mình sẽ hỗ trợ nhanh nhất có thể.
            </p>
            <button type="button" className={styles.supportButton}>
              Nhắn tin
            </button>
          </section>
        </aside>

        <div className={styles.content}>
          <header className={styles.topbar}>
            <label
              className={styles.navButton}
              htmlFor={toggleId}
              aria-label="Mở menu"
            >
              <div className={styles.hamburger} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </label>

            <form
              className={styles.search}
              aria-label="Tìm kiếm"
              onSubmit={handleSearchSubmit}
            >
              <div className={styles.searchIcon} aria-hidden="true">
                <MagnifyingGlass size={18} weight="bold" />
              </div>
              <input
                className={styles.searchInput}
                placeholder={searchPlaceholder}
                type="search"
                name={searchName}
                {...inputProps}
                onChange={
                  onSearchChange
                    ? (event) => onSearchChange(event.target.value)
                    : undefined
                }
                disabled={searchDisabled}
              />
            </form>

            <div className={styles.topActions}>
              <button
                className={`${styles.iconButton} ${styles.bell}`}
                type="button"
                aria-label="Thông báo"
              >
                <Bell size={20} weight="bold" color="#2b3b55" />
              </button>

              <details className={styles.profile}>
                <summary
                  className={styles.profileSummary}
                  aria-label="Mở menu hồ sơ"
                >
                  <div
                    className={`${styles.avatar} ${
                      avatarUrl ? styles.avatarHasImage : ""
                    }`}
                    aria-hidden="true"
                  >
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt="Ảnh đại diện"
                        fill
                        sizes="32px"
                        quality={80}
                        style={{ objectFit: "cover" }}
                      />
                    ) : null}
                  </div>
                  <div className={styles.profileMeta}>
                    <div className={styles.profileName}>{displayName}</div>
                    <div className={styles.profileId}>{userEmail}</div>
                  </div>
                </summary>

                <div
                  className={styles.profileMenu}
                  role="menu"
                  aria-label="Tùy chọn hồ sơ"
                >
                  <Link
                    href="/profile"
                    role="menuitem"
                    className={styles.profileLink}
                  >
                    <span className={styles.menuDot} aria-hidden="true" /> Hồ sơ
                  </Link>
                  <Link
                    href="/profile"
                    role="menuitem"
                    className={styles.profileLink}
                  >
                    <span className={styles.menuDot} aria-hidden="true" /> Cài
                    đặt
                  </Link>
                  <div className={styles.profileSeparator} aria-hidden="true" />
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.profileLink}
                    onClick={handleLogout}
                  >
                    <span className={styles.menuDot} aria-hidden="true" /> Đăng
                    xuất
                  </button>
                </div>
              </details>
            </div>
          </header>

          <main className={styles.main}>
            {pageTitle ? (
              <h1 className={styles.pageTitle}>{pageTitle}</h1>
            ) : null}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
