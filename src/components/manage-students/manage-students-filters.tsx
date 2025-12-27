"use client";

import { FunnelSimple } from "phosphor-react";
import { useEffect, useState } from "react";
import styles from "./manage-students-filters.module.css";

export type StudentStatusFilter =
  | "active"
  | "pending_verification"
  | "deactivated"
  | "all";

export type StudentTierFilter = "free" | "paid" | "all";

type ManageStudentsFiltersProps = {
  status: StudentStatusFilter;
  onStatusChange: (status: StudentStatusFilter) => void;
  tier: StudentTierFilter;
  onTierChange: (tier: StudentTierFilter) => void;
};

export function ManageStudentsFilters({
  status,
  onStatusChange,
  tier,
  onTierChange,
}: ManageStudentsFiltersProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const isStatusActive = status !== "active";
  const isTierActive = tier !== "all";

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const root = event.target.closest("[data-dropdown-root]");
      if (!root) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const toggleDropdown = (key: string) => {
    setOpenDropdown((prev) => (prev === key ? null : key));
  };

  return (
    <section className={`cardBase ${styles.filters}`} aria-label="Filters">
      <fieldset className={styles.filterRow} aria-label="Bộ lọc">
        <div className={styles.dd} data-dropdown-root>
          <button
            type="button"
            className={`${styles.ddButton} ${
              isStatusActive ? styles.ddButtonActive : ""
            }`}
            aria-expanded={openDropdown === "status"}
            onClick={() => toggleDropdown("status")}
          >
            <span>Trạng thái</span>
            {isStatusActive ? (
              <FunnelSimple size={16} weight="bold" />
            ) : (
              <span className={styles.ddChevron} aria-hidden="true" />
            )}
          </button>
          {openDropdown === "status" ? (
            <div className={styles.ddPanel}>
              <fieldset className={styles.ddList} aria-label="Trạng thái">
                <label className={styles.ck}>
                  <input
                    type="radio"
                    name="status"
                    checked={status === "active"}
                    onChange={() => onStatusChange("active")}
                  />
                  Hoạt động
                </label>
                <label className={styles.ck}>
                  <input
                    type="radio"
                    name="status"
                    checked={status === "pending_verification"}
                    onChange={() => onStatusChange("pending_verification")}
                  />
                  Chờ xác minh
                </label>
                <label className={styles.ck}>
                  <input
                    type="radio"
                    name="status"
                    checked={status === "deactivated"}
                    onChange={() => onStatusChange("deactivated")}
                  />
                  Vô hiệu hóa
                </label>
                <label className={styles.ck}>
                  <input
                    type="radio"
                    name="status"
                    checked={status === "all"}
                    onChange={() => onStatusChange("all")}
                  />
                  Tất cả
                </label>
              </fieldset>
            </div>
          ) : null}
        </div>

        <div className={styles.dd} data-dropdown-root>
          <button
            type="button"
            className={`${styles.ddButton} ${
              isTierActive ? styles.ddButtonActive : ""
            }`}
            aria-expanded={openDropdown === "tier"}
            onClick={() => toggleDropdown("tier")}
          >
            <span>Gói</span>
            {isTierActive ? (
              <FunnelSimple size={16} weight="bold" />
            ) : (
              <span className={styles.ddChevron} aria-hidden="true" />
            )}
          </button>
          {openDropdown === "tier" ? (
            <div className={styles.ddPanel}>
              <fieldset className={styles.ddList} aria-label="Gói học">
                <label className={styles.ck}>
                  <input
                    type="radio"
                    name="tier"
                    checked={tier === "all"}
                    onChange={() => onTierChange("all")}
                  />
                  Tất cả
                </label>
                <label className={styles.ck}>
                  <input
                    type="radio"
                    name="tier"
                    checked={tier === "free"}
                    onChange={() => onTierChange("free")}
                  />
                  Miễn phí
                </label>
                <label className={styles.ck}>
                  <input
                    type="radio"
                    name="tier"
                    checked={tier === "paid"}
                    onChange={() => onTierChange("paid")}
                  />
                  Trả phí
                </label>
              </fieldset>
            </div>
          ) : null}
        </div>
      </fieldset>
    </section>
  );
}
