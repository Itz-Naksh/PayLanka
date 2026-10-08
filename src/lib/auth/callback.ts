/**
 * Where to send someone after they sign in.
 *
 * Auth.js passes the page they wanted as a full URL
 * ("http://host/payroll/abc"). Only its path is kept, so the redirect always
 * stays on this site — a crafted link like "?callbackUrl=https://evil.example"
 * or "//evil.example" can't bounce a user to a phishing page (open redirect).
 */
export function safeCallbackPath(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2000) return "/";
  let url: URL;
  try {
    url = new URL(value, "http://paylanka.invalid");
  } catch {
    return "/";
  }
  // Only web pages: "javascript:…", "data:…" and friends are rejected outright.
  if (url.protocol !== "http:" && url.protocol !== "https:") return "/";
  // Collapse leading slashes: "//evil.example" as a path would be protocol-relative.
  const path = url.pathname.replace(/^\/+/, "/");
  if (path === "/login" || path.startsWith("/api/")) return "/";
  return `${path}${url.search}`;
}
