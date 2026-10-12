import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Streamline — Watch what moves you",
  description: "Discover, upload, and watch original videos on Streamline.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
