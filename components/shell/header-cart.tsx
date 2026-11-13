"use client";

import { useEffect, useState } from "react";
import { usePartner } from "@/components/shell/partner-context";
import { CartDrawer } from "@/components/portal/buy-sims/plan-view";
import { Icon } from "@/components/ui/icon";
import { canRestoreCheckout, checkoutFrom, checkoutId, clearCheckout, setCheckoutId, type CheckoutView } from "@/lib/buy-sims";
import { cartEvent, notifyCart, type CartNotice } from "@/lib/cart-bus";
import { asList, asRecord, num, portalRequest, PortalRequestError, requestErrorMessage, text, type JsonRecord } from "@/lib/portal-fetch";

export function HeaderCart() {
  const partner = usePartner();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<CheckoutView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function refreshCount() {
    try {
      let id = checkoutId();
      if (!id && canRestoreCheckout()) {
        const last = await portalRequest<JsonRecord>("/api/buy-sims?resource=last-checkout");
        const data = asRecord(last.data);
        id = text(typeof last.data === "string" ? last.data : data?.checkout_id || data?.id);
        if (id) setCheckoutId(id);
      }
      if (!id) {
        setCount(0);
        notifyCart({ lines: [] });
        return 0;
      }
      const payload = await portalRequest<JsonRecord>(`/api/buy-sims?resource=cart&checkout_id=${encodeURIComponent(id)}`);
      if (sessionStorage.getItem("buy-sims-order") && !checkoutId()) {
        setCount(0);
        notifyCart({ lines: [] });
        return 0;
      }
      const lines = asList(payload.data);
      const addons = new Set(asList(asRecord(payload.addon_cart)?.items).map((item) => text(item.plan_id)).filter(Boolean));
      const total = lines.length + addons.size;
      setCount(total);
      notifyCart({
        lines: lines.map((row) => ({
          id: text(row.package_id),
          quantity: num(row.quantity) || 1,
          lineId: text(row.checkout_line_id),
        })),
      });
      return total;
    } catch (err) {
      if (err instanceof PortalRequestError && err.status === 404) {
        setCount(0);
        clearCheckout();
      }
      return 0;
    }
  }

  async function loadDrawer() {
    const id = checkoutId();
    if (!id) {
      setCart(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = await portalRequest<JsonRecord>("/api/buy-sims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "checkout-packages", checkout_id: id }),
      });
      const view = checkoutFrom(payload);
      if (!view.lines.length && !view.addons.length) {
        const stillThere = await portalRequest<JsonRecord>(`/api/buy-sims?resource=cart&checkout_id=${encodeURIComponent(id)}`)
          .then((cartPayload) => asList(cartPayload.data).length > 0 || asList(asRecord(cartPayload.addon_cart)?.items).length > 0)
          .catch((err: unknown) => !(err instanceof PortalRequestError && err.status === 404));
        if (!stillThere) {
          clearCheckout();
          setCart(null);
          setCount(0);
          setOpen(false);
        }
        return;
      }
      setCart(view);
    } catch (err) {
      setError(requestErrorMessage(err, "Could not load the cart."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshCount().then((total) => {
        if (total > 0 && sessionStorage.getItem("isCartOpen") === "true") notifyCart({ open: true });
      });
    }, 0);
    function onCart(event: Event) {
      const detail = (event as CustomEvent<CartNotice>).detail ?? {};
      if (detail.lines && detail.lines.length === 0) {
        setCount(0);
        setOpen(false);
        sessionStorage.removeItem("isCartOpen");
        return;
      }
      if (detail.lines) return;
      if (detail.close) {
        setOpen(false);
        sessionStorage.removeItem("isCartOpen");
      }
      if (detail.open) {
        setOpen(true);
        sessionStorage.setItem("isCartOpen", "true");
        void loadDrawer();
      }
      if (detail.refresh || detail.open) void refreshCount();
    }
    window.addEventListener(cartEvent, onCart);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(cartEvent, onCart);
    };
  }, []);

  function close() {
    setOpen(false);
    sessionStorage.removeItem("isCartOpen");
  }

  return (
    <>
      <button
        type="button"
        aria-label={count ? `Cart, ${count} items` : "Cart"}
        title="Cart"
        onClick={() => { if (count > 0) notifyCart({ open: true }); }}
        className="relative inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-line px-3 text-sm font-semibold"
      >
        <Icon name="cart" className="h-[18px] w-[18px] text-primary" />
        <span className="hidden lg:inline">Cart</span>
        {count > 0 ? <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">{count}</span> : null}
      </button>
      <CartDrawer
        open={open}
        loading={loading}
        error={error}
        cart={cart}
        onClose={close}
        onRetry={() => void loadDrawer()}
        onChanged={() => { void loadDrawer(); void refreshCount(); }}
        role={partner.role}
        resellerId={partner.resellerId}
        agentId={partner.agentId}
      />
    </>
  );
}
