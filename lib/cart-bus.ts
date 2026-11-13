export type CartLineNotice = { id: string; quantity: number; lineId: string };

export type CartNotice = {
  open?: boolean;
  close?: boolean;
  refresh?: boolean;
  lines?: CartLineNotice[];
};

export const cartEvent = "zetexa-cart";

export function notifyCart(detail: CartNotice = { refresh: true }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<CartNotice>(cartEvent, { detail }));
}
