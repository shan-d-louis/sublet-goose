import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sublet Goose — Ontario Lease Auditor",
  description:
    "AI-powered Ontario RTA lease auditor for University of Waterloo students.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
