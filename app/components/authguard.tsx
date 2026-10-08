"use client";

import { onAuthStateChanged } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user && pathname !== "/login") {
        router.replace("/login");
        return;
      }

      if (user && pathname === "/login") {
        router.replace("/");
        return;
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [pathname, router]);

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f6fa",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            textAlign: "center",
          }}
        >
          <h2 style={{ color: "#111827" }}>WedFlow</h2>
          <p style={{ color: "#6b7280" }}>Checking login...</p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}