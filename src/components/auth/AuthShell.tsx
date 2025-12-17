import Image from "next/image";
import type { PropsWithChildren } from "react";

type AuthShellProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
}>;

export function AuthShell({
  title,
  subtitle,
  footer,
  children,
}: AuthShellProps) {
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[#2868e6] text-white md:block">
        <div className="absolute left-1/2 top-4 -translate-x-1/2">
          <Image
            src="/logo.svg"
            alt="BaiHoc logo"
            width={80}
            height={36}
            priority
          />
        </div>
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-12 py-14">
          <div className="relative flex h-[240px] w-[260px] items-center justify-center">
            <Image
              src="/arrow-hero.svg"
              alt="BaiHoc hero"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="mt-10 w-full max-w-md space-y-3 text-center">
            <h2 className="text-4xl font-semibold">Chào bạn!</h2>
            <p className="text-sm leading-relaxed text-white/85">
              Luyện tập thông minh với các bộ đề, thử thách thời gian, và người
              bạn AI đồng hành trong hành trình học tập của bạn.
            </p>
          </div>
        </div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-12 top-0 h-64 w-64 rounded-full bg-white blur-3xl" />
          <div className="absolute right-4 bottom-10 h-72 w-72 rounded-full bg-black/40 blur-3xl" />
        </div>
      </div>
      <div className="flex max-h-screen flex-col overflow-y-auto bg-white px-6 py-10 text-slate-900 md:px-12 lg:px-20">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              {title}
            </h1>
            {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
          </div>
          <div className="space-y-6">{children}</div>
          {footer && (
            <div className="text-center text-sm text-slate-600">{footer}</div>
          )}
        </div>
      </div>
    </div>
  );
}
