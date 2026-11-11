"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { publicEnv } from "@/lib/public-env";
import { readSavedLanguage, type PortalLanguageCode } from "@/lib/portal-translate";
import { Icon } from "@/components/ui/icon";
import "./portal-widgets.css";

declare global {
  interface Window {
    chatwootSettings?: {
      hideMessageBubble?: boolean;
      position?: "left" | "right";
      locale?: string;
      darkMode?: "light" | "dark" | "auto";
      type?: "standard" | "expanded_bubble";
      launcherTitle?: string;
    };
    chatwootSDK?: {
      run: (config: { websiteToken: string; baseUrl: string }) => void;
    };
    $chatwoot?: {
      setUser: (
        identifier: string,
        user: { email?: string; name?: string },
      ) => void;
      setLocale: (locale: string) => void;
      toggle: (state?: "open" | "close") => void;
      toggleBubbleVisibility: (visibility: "show" | "hide") => void;
    };
  }
}

const DEFAULT_CHATWOOT_URL = "https://chatwoot.zetexa.com";
const DEFAULT_CHATWOOT_TOKEN = "y9bdFMkkFkLPrCULU8V1FEoq";

type SupportMessage = {
  id: string;
  sender: "support" | "user";
  text: string;
};

const quickTopics: Array<{ label: string; reply: string }> = [
  {
    label: "Complete eKYC",
    reply:
      "Click 'Complete eKYC Verification' in the top bar (or 'Verify now' in the sidebar) to fill Company, Address, Bank Info, and Documents.",
  },
  {
    label: "Wallet & Top-up",
    reply:
      "Open the Wallet / Transactions section from the header or sidebar to inspect balances, top-ups, and order debits.",
  },
  {
    label: "Contact Support",
    reply:
      "Reach Zetexa Partner Support anytime at support@zetexa.com or +91 94412 33233.",
  },
];

function CuteBotIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 2.75v2.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="2.3" r="1.15" fill="currentColor" />
      <rect
        x="4"
        y="5.5"
        width="16"
        height="13"
        rx="5.5"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="9.25" cy="11.2" r="1.2" fill="currentColor" />
      <circle cx="14.75" cy="11.2" r="1.2" fill="currentColor" />
      <path
        d="M9.4 14.3c.7.75 1.55 1.1 2.6 1.1s1.9-.35 2.6-1.1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M8.5 18.5 6.8 21l3.6-2.5"
        fill="currentColor"
      />
    </svg>
  );
}

export function ChatwootWidget({
  token,
  name,
  email,
  locale,
  hidden = false,
}: {
  token: string;
  name: string;
  email: string;
  locale: PortalLanguageCode;
  hidden?: boolean;
}) {
  const configuredUrl = (
    publicEnv.production
      ? publicEnv.chatwootProdUrl || publicEnv.chatwootUrl
      : publicEnv.chatwootUrl
  )
    .trim()
    .replace(/\/+$/, "");

  const primaryUrl = configuredUrl || DEFAULT_CHATWOOT_URL;
  const primaryToken = token.trim() || DEFAULT_CHATWOOT_TOKEN;
  const canFallback =
    primaryUrl !== DEFAULT_CHATWOOT_URL || primaryToken !== DEFAULT_CHATWOOT_TOKEN;

  const [sourceIndex, setSourceIndex] = useState(0);
  const [chatwootReady, setChatwootReady] = useState(false);
  const [sdkFailed, setSdkFailed] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<SupportMessage[]>([
    {
      id: "welcome",
      sender: "support",
      text: "Hi! How can ZetSIM Partner Support help you today?",
    },
  ]);

  const listRef = useRef<HTMLDivElement>(null);
  const pendingOpenRef = useRef(false);
  const latestRef = useRef({ name, email, locale, hidden });

  useEffect(() => {
    latestRef.current = { name, email, locale, hidden };
  }, [name, email, locale, hidden]);

  const activeUrl = sourceIndex === 0 ? primaryUrl : DEFAULT_CHATWOOT_URL;
  const activeToken = sourceIndex === 0 ? primaryToken : DEFAULT_CHATWOOT_TOKEN;

  const applyChatwootSettings = useCallback(() => {
    window.chatwootSettings = {
      position: "right",
      type: "standard",
      hideMessageBubble: true,
      darkMode: "light",
      locale: readSavedLanguage(),
    };
  }, []);

  useEffect(() => {
    applyChatwootSettings();
  }, [applyChatwootSettings]);

  useEffect(() => {
    let observer: MutationObserver | null = null;

    const attachHolderObserver = () => {
      const holder = document.querySelector(".woot-widget-holder");
      if (!holder) return;
      holder.classList.add("notranslate");
      const syncOpen = () => {
        setChatOpen(!holder.classList.contains("woot--hide"));
      };
      syncOpen();
      observer?.disconnect();
      observer = new MutationObserver(syncOpen);
      observer.observe(holder, { attributes: true, attributeFilter: ["class"] });
    };

    const handleReady = () => {
      const state = latestRef.current;
      setChatwootReady(true);
      attachHolderObserver();
      try {
        window.$chatwoot?.setUser(state.email || state.name || "partner", {
          email: state.email || undefined,
          name: state.name || undefined,
        });
        window.$chatwoot?.setLocale(state.locale);
        window.$chatwoot?.toggleBubbleVisibility("hide");
        if (pendingOpenRef.current && !state.hidden) {
          pendingOpenRef.current = false;
          setFallbackOpen(false);
          window.$chatwoot?.toggle("open");
        }
      } catch {
        // Ignore SDK timing edge cases.
      }
    };

    window.addEventListener("chatwoot:ready", handleReady);
    if (window.chatwootSDK && window.$chatwoot) {
      handleReady();
    }

    return () => {
      window.removeEventListener("chatwoot:ready", handleReady);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!chatwootReady) return;
    try {
      window.$chatwoot?.setLocale(locale);
    } catch {
      // Ignore if SDK is not ready yet.
    }
  }, [chatwootReady, locale]);

  useEffect(() => {
    if (!hidden || !chatwootReady) return;
    try {
      window.$chatwoot?.toggle("close");
    } catch {
      // Ignore if SDK is not ready yet.
    }
  }, [hidden, chatwootReady]);

  useEffect(() => {
    if (!fallbackOpen || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, fallbackOpen]);

  function handleScriptLoad() {
    applyChatwootSettings();
    window.chatwootSDK?.run({
      websiteToken: activeToken,
      baseUrl: activeUrl,
    });
  }

  function handleScriptError() {
    if (sourceIndex === 0 && canFallback) {
      setSourceIndex(1);
      return;
    }
    setSdkFailed(true);
  }

  function handleLauncherClick() {
    if (chatwootReady && window.$chatwoot) {
      window.$chatwoot.toggle(chatOpen ? "close" : "open");
      return;
    }
    if (!sdkFailed) {
      pendingOpenRef.current = !fallbackOpen;
    }
    setFallbackOpen((current) => !current);
  }

  function addExchange(userText: string, supportText: string) {
    setMessages((current) => {
      const stamp = current.length + 1;
      return [
        ...current,
        { id: `u-${stamp}`, sender: "user", text: userText },
        { id: `s-${stamp}`, sender: "support", text: supportText },
      ];
    });
  }

  function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    addExchange(
      text,
      "Thanks for reaching out! Our partner support team is available at support@zetexa.com or +91 94412 33233 and typically replies in a few minutes.",
    );
  }

  const isOpen = chatwootReady ? chatOpen : fallbackOpen;

  return (
    <>
      <Script
        key={activeUrl}
        id={`chatwoot-script-${sourceIndex}`}
        src={`${activeUrl}/packs/js/sdk.js`}
        strategy="lazyOnload"
        onLoad={handleScriptLoad}
        onError={handleScriptError}
      />

      {!hidden ? (
        <div
          className={`notranslate fixed right-4 bottom-4 z-[2147483000] flex flex-col items-end gap-3 sm:right-5 sm:bottom-5 ${
            chatwootReady && chatOpen ? "hidden sm:flex" : ""
          }`}
        >
          {!chatwootReady && fallbackOpen ? (
            <section
              aria-label="ZetSIM Partner Portal Support"
              className="flex h-[min(31rem,calc(100dvh-6.5rem))] w-[min(23.5rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[1.5rem] border border-line bg-surface shadow-[0_24px_60px_color-mix(in_srgb,var(--navy)_22%,transparent)]"
            >
              <div className="border-b border-line bg-surface px-5 py-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-ink">
                    ZetSIM Partner Portal Support
                  </h3>
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  Typically replies in a few minutes
                </p>
              </div>

              <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-soft/60 p-4">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-xs">
                  <div>
                    <p className="text-sm font-semibold text-ink">We are online</p>
                    <p className="text-xs text-muted">
                      {sdkFailed
                        ? "Typically replies in a few minutes"
                        : "Connecting live chat..."}
                    </p>
                  </div>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mint text-primary">
                    <CuteBotIcon className="h-5 w-5" />
                  </span>
                </div>

                {messages.map((item) => (
                  <div
                    key={item.id}
                    className={`flex ${item.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <p
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-5 ${
                        item.sender === "user"
                          ? "rounded-br-sm bg-primary text-on-primary"
                          : "rounded-bl-sm border border-line bg-surface text-ink"
                      }`}
                    >
                      {item.text}
                    </p>
                  </div>
                ))}

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {quickTopics.map((topic) => (
                    <button
                      key={topic.label}
                      type="button"
                      onClick={() => addExchange(topic.label, topic.reply)}
                      className="cursor-pointer rounded-full border border-primary/30 bg-surface px-3 py-1.5 text-xs font-medium text-primary transition hover:border-primary hover:bg-mint"
                    >
                      {topic.label}
                    </button>
                  ))}
                </div>
              </div>

              <form
                onSubmit={handleSend}
                className="flex items-center gap-2 border-t border-line bg-surface px-3 py-2.5"
              >
                <input
                  type="text"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Start conversation..."
                  aria-label="Message ZetSIM Partner Portal Support"
                  className="min-w-0 flex-1 rounded-full border border-line bg-page px-3.5 py-2 text-xs text-ink outline-none placeholder:text-muted focus:border-primary"
                />
                <button
                  type="submit"
                  aria-label="Send message"
                  className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full bg-primary text-on-primary transition hover:bg-primary-hover"
                >
                  <Icon name="send" className="h-4 w-4" />
                </button>
              </form>
            </section>
          ) : null}

          <div className="group relative flex flex-col items-end">
            {!isOpen ? (
              <span className="pointer-events-none mb-2 translate-y-1 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink opacity-0 shadow-md transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                Hi! Need help?
              </span>
            ) : null}

            <button
              type="button"
              onClick={handleLauncherClick}
              aria-expanded={isOpen}
              aria-label={isOpen ? "Close support chat" : "Chat with us"}
              className={`inline-flex cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-[var(--teal)] to-[var(--teal-deep)] text-on-primary shadow-[0_16px_36px_color-mix(in_srgb,var(--teal-deep)_34%,transparent)] ring-2 ring-white/85 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_color-mix(in_srgb,var(--teal-deep)_42%,transparent)] active:translate-y-0 ${
                isOpen ? "h-12 w-12" : "h-[3.25rem] gap-2.5 pr-5 pl-2"
              }`}
            >
              {isOpen ? (
                <Icon name="close" className="h-5 w-5" />
              ) : (
                <>
                  <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-primary shadow-xs">
                    <CuteBotIcon className="chat-bot-bob h-5 w-5" />
                    <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
                    </span>
                  </span>
                  <span className="text-left">
                    <span className="block text-sm leading-tight font-semibold tracking-tight">
                      Chat with us
                    </span>
                    <span className="block text-[11px] leading-tight font-medium text-white/85">
                      Support online
                    </span>
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
