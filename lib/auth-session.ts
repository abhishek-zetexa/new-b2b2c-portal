export const sessionCookie = "zetexa_session";
export const apiKeyCookie = "zetexa_api_key";
export const userCookie = "zetexa_user";

export type AuthUser = {
  email: string;
  name: string;
  resellerId: string;
  role: string;
  dashboardEnabled: boolean;
};

export function parseAuthUser(raw: string | undefined): AuthUser | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<AuthUser>;
    if (!value.email || typeof value.email !== "string") return null;
    return {
      email: value.email,
      name: value.name || "Partner",
      resellerId: value.resellerId || "",
      role: value.role || "",
      dashboardEnabled: value.dashboardEnabled !== false,
    };
  } catch {
    return null;
  }
}
