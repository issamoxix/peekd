import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adblume Query Gap Engine",
  description: "Detect query gaps, validate brand fit, and generate next actions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
