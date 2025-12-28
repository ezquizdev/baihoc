type AvatarPlaceholderMarkProps = {
  className?: string;
};

export function AvatarPlaceholderMark({
  className,
}: AvatarPlaceholderMarkProps) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M4 6.5c0-.83.67-1.5 1.5-1.5H10v6H4V6.5ZM14 5h4.5c.83 0 1.5.67 1.5 1.5V11h-6V5Z"
        fill="currentColor"
      />
      <path
        d="M7.2 11.2h9.6v3.2c0 2.65-2.15 4.8-4.8 4.8s-4.8-2.15-4.8-4.8v-3.2Z"
        fill="currentColor"
      />
    </svg>
  );
}
