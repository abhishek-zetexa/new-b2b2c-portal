export const sessionCookie = "zetexa_session";
export const apiKeyCookie = "zetexa_api_key";
export const userCookie = "zetexa_user";

export type FeatureAccess = Record<string, string[]>;

export type AuthUser = {
  email: string;
  name: string;
  firstName: string;
  resellerId: string;
  agentId: string;
  role: string;
  dashboardEnabled: boolean;
  cashbackEligible: boolean;
  featureAccess: FeatureAccess;
};

export function featureAccessFrom(value: unknown): FeatureAccess {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const access: FeatureAccess = {};
  for (const [key, permissions] of Object.entries(value)) {
    if (Array.isArray(permissions)) {
      access[key] = permissions.filter((item): item is string => typeof item === "string");
    } else {
      access[key] = [];
    }
  }
  return access;
}

export function hasMenuFlag(access: FeatureAccess, flag: string) {
  return Object.prototype.hasOwnProperty.call(access, flag);
}

export function hasPermission(access: FeatureAccess, permission: string) {
  return Object.values(access).some((permissions) => permissions.includes(permission));
}

export function parseAuthUser(raw: string | undefined): AuthUser | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (typeof value.email !== "string" || !value.email) return null;
    const cashback = value.cashbackEligible;
    return {
      email: value.email,
      name: typeof value.name === "string" && value.name ? value.name : "Partner",
      firstName: typeof value.firstName === "string" ? value.firstName : "",
      resellerId: typeof value.resellerId === "string" ? value.resellerId : "",
      agentId: typeof value.agentId === "string" ? value.agentId : "",
      role: typeof value.role === "string" ? value.role : "",
      dashboardEnabled: value.dashboardEnabled !== false,
      cashbackEligible: cashback === true || cashback === "true",
      featureAccess: featureAccessFrom(value.featureAccess),
    };
  } catch {
    return null;
  }
}
