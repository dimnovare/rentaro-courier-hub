import "@testing-library/jest-dom";
import type { ReactNode } from "react";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom does not implement the App Router runtime, so components that call
// `useRouter`/`Link` from next/navigation+next/link would throw
// ("invariant expected app router to be mounted"). Stub both with inert
// implementations so component tests can render real components in isolation.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  // Render a plain anchor that forwards href + children.
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string | { pathname?: string };
    children: ReactNode;
  } & Record<string, unknown>) => {
    const url = typeof href === "string" ? href : (href?.pathname ?? "");
    return (
      <a href={url} {...rest}>
        {children}
      </a>
    );
  },
}));

// Unmount React trees and clear jsdom between tests to avoid cross-test bleed.
afterEach(() => {
  cleanup();
});
