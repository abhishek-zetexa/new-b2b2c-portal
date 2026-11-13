import { ancillaryImage } from "@/lib/dashboard";
import { asList, asRecord, text } from "@/lib/portal-fetch";

export type PortalProduct = {
  key: string;
  serviceName: string;
  displayName: string;
  imageUrl: string;
  icon: string;
  subscribed: boolean;
  editable: boolean;
  markup: string;
  sendEmail: boolean;
  isWhatsappBot: boolean;
};

export const staticProducts: PortalProduct[] = [
  {
    key: "travel-esims",
    serviceName: "TRAVEL eSIMS",
    displayName: "TRAVEL eSIMS",
    imageUrl: "",
    icon: "/products/esim.webp",
    subscribed: true,
    editable: false,
    markup: "",
    sendEmail: false,
    isWhatsappBot: false,
  },
  {
    key: "local-esims",
    serviceName: "Local eSIMS",
    displayName: "Local eSIMS",
    imageUrl: "",
    icon: "/products/esim.webp",
    subscribed: true,
    editable: false,
    markup: "",
    sendEmail: false,
    isWhatsappBot: false,
  },
  {
    key: "whatsapp-bot",
    serviceName: "WhatsApp Bot",
    displayName: "WhatsApp Bot",
    imageUrl: "",
    icon: "/products/whatsapp-bot.png",
    subscribed: false,
    editable: false,
    markup: "",
    sendEmail: false,
    isWhatsappBot: true,
  },
];

function flag(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

export function catalogProducts(payload: unknown): PortalProduct[] {
  const root = asRecord(payload);
  const data = root?.data;
  const rows = Array.isArray(data) ? asList(data) : data ? [data] : [];
  const apiProducts = asList(rows).map((row, index) => {
    const serviceName = text(row.service_name);
    const displayName = text(row.display_name || serviceName);
    const markup = row.reseller_mark_up_percentage;
    return {
      key: `${serviceName || "service"}-${index}`,
      serviceName,
      displayName,
      imageUrl: text(row.service_image_url),
      icon: "",
      subscribed: flag(row.subscribed),
      editable: true,
      markup: markup == null || markup === "" ? "" : String(markup),
      sendEmail: flag(row.send_email_to_customer),
      isWhatsappBot: false,
    } satisfies PortalProduct;
  });
  return [...staticProducts, ...apiProducts];
}

export function productImage(product: PortalProduct) {
  return product.imageUrl || product.icon || ancillaryImage(product.displayName);
}

export function productTitle(name: string) {
  const value = name.trim();
  if (!value || /[\s-]/.test(value)) return value;
  return value
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/\bZet Pass\b/g, "ZetPass");
}

export function markupError(value: string) {
  const raw = value.trim();
  if (!raw || Number.isNaN(Number(raw))) return "Product MarkUp is required";
  if (Number(raw) > 100) return "MarkUp cannot exceed 100%";
  return "";
}
