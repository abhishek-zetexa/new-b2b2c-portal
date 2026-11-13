export type NavItem = {
  label: string;
  href: string;
  icon: string;
  flag?: string;
  agentHidden?: boolean;
  children?: { label: string; href: string }[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const portalNav: NavGroup[] = [
  {
    label: "Sell",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "grid" },
      { label: "Products", href: "/products", icon: "box" },
      { label: "Buy SIMs", href: "/buy-sims", icon: "sim", flag: "BuySimFlow" },
      { label: "Buy Addons Service", href: "/buy-airport-service", icon: "plane" },
      {
        label: "Orders",
        href: "/order-menu",
        icon: "orders",
        children: [
          { label: "eSIM Orders", href: "/order-menu" },
          { label: "Local SIM Orders", href: "/order-menu/local-sim" },
        ],
      },
    ],
  },
  {
    label: "Customers",
    items: [
      { label: "Customer management", href: "/customer-management", icon: "users" },
      { label: "Agent management", href: "/agent-management", icon: "user" },
      { label: "Sim Inventory", href: "/sim-inventory", icon: "inventory" },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Wallet", href: "/transactions", icon: "wallet", flag: "Wallet" },
      { label: "Reports", href: "/reports", icon: "chart", flag: "Reports" },
      { label: "Coupon Programs", href: "/coupon-programs", icon: "tag" },
    ],
  },
  {
    label: "Platform",
    items: [
      { label: "Developer APIs", href: "/developer-api", icon: "code", flag: "DeveloperAPI" },
      { label: "Branding & Preference", href: "/branding", icon: "palette", agentHidden: true },
      { label: "Help", href: "/help-menu", icon: "help", flag: "HelpMenu" },
      { label: "Installation Guide", href: "/installation-guide", icon: "book", flag: "InstallationGuide" },
    ],
  },
];

export const financeNavGroup = portalNav.find((group) => group.label === "Finance")!;
export const platformNavGroup = portalNav.find((group) => group.label === "Platform")!;

export const accountNav: NavItem[] = [
  { label: "Settings", href: "/settings", icon: "settings" },
  { label: "Profile", href: "/profile", icon: "person" },
];

export function findNavItem(pathname: string) {
  const account = accountNav.find((item) => item.href === pathname);
  if (account) return account;
  const items = portalNav.flatMap((group) => group.items);
  const child = items
    .flatMap((item) => item.children ?? [])
    .find((entry) => entry.href === pathname);
  if (child) return child;
  return (
    items.find((item) =>
      item.children ? pathname.startsWith(item.href) : item.href === pathname,
    ) ?? { label: "Partner portal", href: "/dashboard" }
  );
}
