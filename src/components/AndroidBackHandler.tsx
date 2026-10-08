import { useEffect } from "react";

// Inside the Android app, the phone's back button walks browser history.
// When a dialog/sheet/menu is open, add a history step so "back" closes it
// first instead of leaving the page. Only active inside the native app.
export function AndroidBackHandler() {
  useEffect(() => {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (!cap?.isNativePlatform?.()) return;

    const SEL = '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"][data-state="open"]';
    let pushed = false;

    const check = () => {
      const open = !!document.querySelector(SEL);
      if (open && !pushed) {
        history.pushState({ ...(history.state ?? {}), __modal: true }, "");
        pushed = true;
      } else if (!open && pushed) {
        pushed = false;
        if (history.state?.__modal) history.back();
      }
    };

    const onPop = () => {
      if (pushed && document.querySelector(SEL)) {
        pushed = false;
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        (document.activeElement as HTMLElement | null)?.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
      }
    };

    const mo = new MutationObserver(check);
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-state"] });
    window.addEventListener("popstate", onPop);
    return () => {
      mo.disconnect();
      window.removeEventListener("popstate", onPop);
    };
  }, []);
  return null;
}
