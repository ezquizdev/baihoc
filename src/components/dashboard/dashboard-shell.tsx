"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  GearSix,
  MagnifyingGlass,
  SignOut,
  UserCircle,
} from "phosphor-react";
import {
  type FormEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "./dashboard-shell.module.css";

type FeatureSearchItem = {
  label: string;
  href: Parameters<typeof Link>[0]["href"];
  keywords?: string[];
};

function normalizeForSearch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

type NavItem = {
  key: string;
  label: string;
  href?: Parameters<typeof Link>[0]["href"];
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
  { key: "history", label: "Lịch sử", href: "/dashboard/history" },
  {
    key: "leaderboard",
    label: "Bảng xếp hạng",
    href: "/dashboard/leaderboard",
  },
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
  type RouterHref = Parameters<typeof router.push>[0];
  const displayName = userName ?? userEmail.split("@")[0];
  const toggleId = "dashboard-nav-toggle";
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    if (!notificationsOpen) return;
    const handleOutsideClick = (event: globalThis.MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (notificationsRef.current?.contains(target)) return;
      setNotificationsOpen(false);
    };
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setNotificationsOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [notificationsOpen]);

  const isFeatureSearch = !onSearchChange && !onSearchSubmit;
  const [featureQuery, setFeatureQuery] = useState("");
  const [featureOpen, setFeatureOpen] = useState(false);
  const [featureActiveIndex, setFeatureActiveIndex] = useState(0);
  const searchRef = useRef<HTMLFormElement | null>(null);

  const featureItems = useMemo<FeatureSearchItem[]>(() => {
    if (!isFeatureSearch) return [];
    const items: FeatureSearchItem[] = [];
    navItems.forEach((item) => {
      if (!item.href) return;
      items.push({ label: item.label, href: item.href });
    });
    items.push({ label: "Hồ sơ", href: "/profile" });

    const seen = new Set<string>();
    return items.filter((item) => {
      const hrefKey =
        typeof item.href === "string" ? item.href : JSON.stringify(item.href);
      const key = `${normalizeForSearch(item.label)}|${hrefKey}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [isFeatureSearch, navItems]);

  const featureSuggestions = useMemo(() => {
    if (!isFeatureSearch || !featureOpen) return [];
    const query = normalizeForSearch(featureQuery);
    const base = featureItems;
    const filtered = query
      ? base.filter((item) => {
          const haystack = `${item.label} ${(item.keywords ?? []).join(" ")}`;
          return normalizeForSearch(haystack).includes(query);
        })
      : base;
    return filtered.slice(0, 8);
  }, [featureItems, featureOpen, featureQuery, isFeatureSearch]);

  useEffect(() => {
    if (!isFeatureSearch || !featureOpen) return;
    const handleOutsideClick = (event: globalThis.MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (searchRef.current?.contains(target)) return;
      setFeatureOpen(false);
    };
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setFeatureOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [featureOpen, isFeatureSearch]);

  useEffect(() => {
    if (!featureOpen) return;
    if (featureActiveIndex < featureSuggestions.length) return;
    setFeatureActiveIndex(0);
  }, [featureActiveIndex, featureOpen, featureSuggestions.length]);

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
  const standardInputProps =
    searchValue !== undefined ? { value: searchValue } : undefined;

  const navigateFeatureHref = (href: FeatureSearchItem["href"]) => {
    setFeatureOpen(false);
    setFeatureQuery("");
    if (typeof href === "string") {
      router.push(href);
      return;
    }
    if ("pathname" in href && typeof href.pathname === "string") {
      router.push(href.pathname as RouterHref);
      return;
    }
    router.push("/" as RouterHref);
  };

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

            {isFeatureSearch ? (
              <form
                className={styles.search}
                aria-label="Tìm kiếm"
                onSubmit={handleSearchSubmit}
                autoComplete="off"
                ref={searchRef}
              >
                <div className={styles.searchIcon} aria-hidden="true">
                  <MagnifyingGlass size={18} weight="bold" />
                </div>
                <input
                  className={styles.searchInput}
                  placeholder={searchPlaceholder}
                  type="search"
                  name={searchName}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={featureQuery}
                  onChange={(event) => {
                    const value = event.target.value;
                    setFeatureQuery(value);
                    setFeatureActiveIndex(0);
                    setFeatureOpen(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      if (!featureOpen) {
                        setFeatureOpen(true);
                        setFeatureActiveIndex(0);
                        return;
                      }
                      setFeatureActiveIndex((prev) => {
                        const count = Math.max(featureSuggestions.length, 1);
                        return (prev + 1) % count;
                      });
                      return;
                    }
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      if (!featureOpen) {
                        setFeatureOpen(true);
                        setFeatureActiveIndex(0);
                        return;
                      }
                      setFeatureActiveIndex((prev) => {
                        const count = Math.max(featureSuggestions.length, 1);
                        return (prev - 1 + count) % count;
                      });
                      return;
                    }
                    if (event.key === "Enter") {
                      if (!featureOpen) return;
                      if (featureSuggestions.length === 0) return;
                      event.preventDefault();
                      const selected =
                        featureSuggestions[featureActiveIndex] ??
                        featureSuggestions[0];
                      if (!selected) return;
                      navigateFeatureHref(selected.href);
                      return;
                    }
                    if (event.key === "Escape") {
                      if (!featureOpen) return;
                      event.preventDefault();
                      setFeatureOpen(false);
                    }
                  }}
                  onFocus={() => {
                    setFeatureOpen(true);
                  }}
                  onBlur={(event) => {
                    const nextTarget = event.relatedTarget as Node | null;
                    if (nextTarget && searchRef.current?.contains(nextTarget)) {
                      return;
                    }
                    setFeatureOpen(false);
                  }}
                  role="combobox"
                  aria-expanded={featureOpen}
                  aria-haspopup="listbox"
                  aria-controls="dashboard-feature-suggestions"
                  aria-activedescendant={
                    featureOpen && featureSuggestions.length
                      ? `dashboard-feature-option-${featureActiveIndex}`
                      : undefined
                  }
                  aria-autocomplete="list"
                  disabled={searchDisabled}
                />

                {featureOpen ? (
                  <div
                    id="dashboard-feature-suggestions"
                    className={styles.searchSuggestions}
                    role="listbox"
                    aria-label="Gợi ý tính năng"
                  >
                    {featureSuggestions.length ? (
                      featureSuggestions.map((item, index) => {
                        const isActive = index === featureActiveIndex;
                        const hrefKey =
                          typeof item.href === "string"
                            ? item.href
                            : JSON.stringify(item.href);
                        return (
                          <button
                            key={`${item.label}-${hrefKey}`}
                            type="button"
                            role="option"
                            id={`dashboard-feature-option-${index}`}
                            aria-selected={isActive}
                            tabIndex={-1}
                            className={`${styles.searchSuggestionItem} ${
                              isActive ? styles.searchSuggestionItemActive : ""
                            }`}
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseEnter={() => setFeatureActiveIndex(index)}
                            onClick={() => navigateFeatureHref(item.href)}
                          >
                            <span className={styles.searchSuggestionLabel}>
                              {item.label}
                            </span>
                            <span className={styles.searchSuggestionMeta}>
                              Enter
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <div className={styles.searchSuggestionEmpty}>
                        Không tìm thấy tính năng
                      </div>
                    )}
                  </div>
                ) : null}
              </form>
            ) : (
              <form
                className={styles.search}
                aria-label="Tìm kiếm"
                onSubmit={handleSearchSubmit}
                autoComplete="off"
              >
                <div className={styles.searchIcon} aria-hidden="true">
                  <MagnifyingGlass size={18} weight="bold" />
                </div>
                <input
                  className={styles.searchInput}
                  placeholder={searchPlaceholder}
                  type="search"
                  name={searchName}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  {...standardInputProps}
                  onChange={
                    onSearchChange
                      ? (event) => onSearchChange(event.target.value)
                      : undefined
                  }
                  disabled={searchDisabled}
                />
              </form>
            )}

            <div className={styles.topActions}>
              <details
                className={styles.notifications}
                ref={notificationsRef}
                open={notificationsOpen}
                onToggle={(event) => {
                  setNotificationsOpen(
                    (event.currentTarget as HTMLDetailsElement).open,
                  );
                }}
              >
                <summary
                  className={`${styles.iconButton} ${styles.notificationSummary}`}
                  aria-label="Thông báo"
                >
                  <Bell size={20} weight="bold" color="#2b3b55" />
                </summary>
                <div
                  className={styles.notificationMenu}
                  role="menu"
                  aria-label="Thông báo"
                >
                  <div className={styles.notificationHeader}>
                    <div className={styles.notificationTitle}>Thông báo</div>
                  </div>
                  <div className={styles.notificationEmpty}>
                    Chưa có thông báo
                  </div>
                </div>
              </details>

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
                    <UserCircle
                      size={18}
                      weight="bold"
                      className={styles.profileIcon}
                      aria-hidden="true"
                    />
                    Hồ sơ
                  </Link>
                  <Link
                    href="/profile"
                    role="menuitem"
                    className={styles.profileLink}
                  >
                    <GearSix
                      size={18}
                      weight="bold"
                      className={styles.profileIcon}
                      aria-hidden="true"
                    />
                    Cài đặt
                  </Link>
                  <div className={styles.profileSeparator} aria-hidden="true" />
                  <button
                    type="button"
                    role="menuitem"
                    className={`${styles.profileLink} ${styles.profileLinkDestructive}`}
                    onClick={handleLogout}
                  >
                    <SignOut
                      size={18}
                      weight="bold"
                      className={styles.profileIcon}
                      aria-hidden="true"
                    />
                    Đăng xuất
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
