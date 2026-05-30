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

// @/i18n/navigation re-exports next-intl-aware versions of Link/useRouter/
// usePathname. In tests, delegate to the same inert stubs as next/link +
// next/navigation so component tests can render without a router context.
vi.mock("@/i18n/navigation", () => ({
  __esModule: true,
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string | { pathname?: string };
    children: import("react").ReactNode;
  } & Record<string, unknown>) => {
    const url = typeof href === "string" ? href : (href?.pathname ?? "");
    return (
      <a href={url} {...rest}>
        {children}
      </a>
    );
  },
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  redirect: vi.fn(),
  getPathname: vi.fn(() => "/"),
}));

// next-intl needs a request/provider context the jsdom test runtime doesn't
// have. Resolve translations against the real `messages/en.json` so component
// tests assert on actual English copy (not key names). `vi.hoisted` builds the
// pure resolver above the hoisted `vi.mock` factories; each factory imports the
// catalog itself to stay clear of mock-hoisting initialization order.
const intl = vi.hoisted(() => {
  type Messages = Record<string, unknown>;
  const lookup = (msgs: Messages, path: string): unknown =>
    path
      .split(".")
      .reduce<unknown>(
        (o, k) =>
          o && typeof o === "object"
            ? (o as Record<string, unknown>)[k]
            : undefined,
        msgs,
      );
  const makeT = (msgs: Messages, namespace?: string) => {
    const t = (key: string, values?: Record<string, unknown>) => {
      const full = namespace ? `${namespace}.${key}` : key;
      const msg = lookup(msgs, full);
      if (typeof msg !== "string") return full;
      return values
        ? msg.replace(/\{(\w+)\}/g, (_, k: string) =>
            k in values ? String(values[k]) : `{${k}}`,
          )
        : msg;
    };
    t.raw = (key: string) =>
      lookup(msgs, namespace ? `${namespace}.${key}` : key);
    t.has = (key: string) =>
      typeof lookup(msgs, namespace ? `${namespace}.${key}` : key) !==
      "undefined";
    return t;
  };
  return { makeT };
});

vi.mock("next-intl", async () => {
  const enMessages = (await import("./messages/en.json"))
    .default as Record<string, unknown>;
  return {
    useTranslations: (namespace?: string) => intl.makeT(enMessages, namespace),
    useLocale: () => "en",
    useMessages: () => enMessages,
    NextIntlClientProvider: ({ children }: { children: ReactNode }) => children,
  };
});

vi.mock("next-intl/server", async () => {
  const enMessages = (await import("./messages/en.json"))
    .default as Record<string, unknown>;
  return {
    getTranslations: async (namespace?: string) =>
      intl.makeT(enMessages, namespace),
    getLocale: async () => "en",
    getMessages: async () => enMessages,
    setRequestLocale: vi.fn(), // no-op in tests
  };
});

// Unmount React trees and clear jsdom between tests to avoid cross-test bleed.
afterEach(() => {
  cleanup();
});
