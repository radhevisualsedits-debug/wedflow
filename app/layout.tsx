import type { Metadata } from "next";
import "./globals.css";
import AuthGuard from "./authguard";
import ServiceWorkerRegister from "./ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "WedFlow",
  description: "Wedding Studio Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthGuard>{children}</AuthGuard>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}