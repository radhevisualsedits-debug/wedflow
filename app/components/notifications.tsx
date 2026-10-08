"use client";

import { useEffect, useState } from "react";

export default function Notifications() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator
    ) {
      setSupported(true);
      setPermission(Notification.permission);

      navigator.serviceWorker
        .register("/sw.js")
        .catch((error) => {
          console.error("Service worker registration failed:", error);
        });
    }
  }, []);

  const enableNotifications = async () => {
    if (!supported) {
      alert("આ browser notifications support કરતું નથી.");
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        const registration = await navigator.serviceWorker.ready;

        await registration.showNotification("WedFlow 🔔", {
          body: "Notifications successfully enabled.",
          icon: "/favicon.ico",
        });
      }
    } catch (error) {
      console.error("Notification permission error:", error);
    }
  };

  if (!supported) {
    return null;
  }

  if (permission === "granted") {
    return (
      <div
        style={{
          background: "#dcfce7",
          color: "#166534",
          padding: "10px 14px",
          borderRadius: "10px",
          fontSize: "13px",
          fontWeight: 600,
          display: "inline-block",
        }}
      >
        🔔 Notifications Enabled
      </div>
    );
  }

  return (
    <button
      onClick={enableNotifications}
      style={{
        border: "none",
        background: "#111827",
        color: "white",
        padding: "11px 16px",
        borderRadius: "10px",
        cursor: "pointer",
        fontWeight: 700,
      }}
    >
      🔔 Enable Notifications
    </button>
  );
}