export function signedInPath(dashboardEnabled: boolean | undefined) {
  return dashboardEnabled === false ? "/pending-approval" : "/dashboard";
}

export function enterApp(dashboardEnabled: boolean | undefined) {
  window.location.assign(signedInPath(dashboardEnabled));
}

export async function endSession() {
  try {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) return false;
  } catch {
    return false;
  }
  try {
    const theme = localStorage.getItem("portal-theme");
    localStorage.clear();
    if (theme === "dark" || theme === "light") localStorage.setItem("portal-theme", theme);
  } catch {
    /* the timezone preference is stored here and should not block sign-out */
  }
  window.location.replace("/login");
  return true;
}

export async function postAuth<T>(url: string, body: unknown): Promise<{ ok: boolean; data: T }> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T;
  return { ok: response.ok, data };
}

export function authMessage(data: { message?: string } | null | undefined, fallback: string) {
  const message = data?.message?.trim() || "";
  if (!message || /<[a-z!/]/i.test(message)) return fallback;
  return message;
}
