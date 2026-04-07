// Cookie helper functions for client-side cookie operations

/**
 * Read a cookie value by name
 * @param name - The name of the cookie to read
 * @returns The cookie value or null if not found
 */
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Clear a cookie by setting its max-age to 0
 * @param name - The name of the cookie to clear
 * @param path - The path of the cookie (default: '/')
 */
export function clearCookie(name: string, path: string = "/"): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=${path}; max-age=0`;
}

/**
 * Check if a cookie exists
 * @param name - The name of the cookie to check
 * @returns True if the cookie exists
 */
export function hasCookie(name: string): boolean {
  return getCookie(name) !== null;
}
