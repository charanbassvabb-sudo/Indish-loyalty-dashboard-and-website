import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BranchProvider } from "@/context/BranchContext";
import { SiteContentProvider } from "@/context/SiteContentContext";
import { ToastProvider } from "@/context/ToastContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <SiteContentProvider>
          <BranchProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </BranchProvider>
        </SiteContentProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);

// Offline-friendly caching for the app shell + menu pages (see public/sw.js).
// Registered post-load so it never competes with the initial page render.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal — the site works fully online without it.
    });
  });
}
