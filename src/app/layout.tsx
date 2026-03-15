import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sterling Tender Doc Generator",
  description: "Generate tender documents for Sterling Electricals & Technologies",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
