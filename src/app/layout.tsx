import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaaS - Your Remote AI Workstation",
  description: "Lab as a Service - Launch AI Workspaces in Minutes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
