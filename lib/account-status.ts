export type AccountStatus = {
  kycStatus: string;
  showEkyc: boolean;
  showVerify: boolean;
  verifyTitle: string;
  verifyBody: string;
  walletLabel: string;
  walletMessage: string;
  walletTone: "alert" | "ok";
};

const defaultTitle = "Unlock 5% off!";
const defaultBody =
  "Complete your eKYC verification to unlock an extra 5% discount and start saving.";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function roleName(role: string) {
  return role.trim().replace(/[\s-]+/g, "_").toUpperCase();
}

export function parseAccountStatus(payload: unknown, role: string): AccountStatus | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (record.success === false) return null;

  const kycStatus = text(record.kyc_status).toUpperCase();
  const normalizedRole = roleName(role);
  const message =
    record.message && typeof record.message === "object"
      ? (record.message as Record<string, unknown>)
      : null;
  const wallet =
    record.wallet_status && typeof record.wallet_status === "object"
      ? (record.wallet_status as Record<string, unknown>)
      : null;
  const walletLabel = text(wallet?.status);
  const walletMessage = text(wallet?.message);
  const restricted = /insufficient|restricted|low|contact your admin/i.test(
    `${walletLabel} ${walletMessage}`,
  );

  return {
    kycStatus,
    showEkyc: kycStatus === "INIT" && normalizedRole !== "RESELLER_AGENT",
    showVerify:
      (kycStatus === "INIT" || kycStatus === "REJECTED") &&
      normalizedRole === "RESELLER_ADMIN",
    verifyTitle: text(message?.header_text) || defaultTitle,
    verifyBody: text(message?.message) || defaultBody,
    walletLabel,
    walletMessage,
    walletTone: restricted ? "alert" : "ok",
  };
}
