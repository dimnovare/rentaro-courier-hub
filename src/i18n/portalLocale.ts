export const PORTAL_LOCALE_CHOICE_COOKIE = "rentaro_portal_locale_explicit";

export function markPortalLocaleChoice(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${PORTAL_LOCALE_CHOICE_COOKIE}=1; path=/; max-age=31536000; SameSite=Lax`;
}

export function hasPortalLocaleChoice(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((part) => part.trim().startsWith(`${PORTAL_LOCALE_CHOICE_COOKIE}=`));
}

