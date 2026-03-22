import type { Metadata } from "next";
import "./globals.css";

// OPTIONAL: use safe font instead of Geist
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Mentor Platform 🚀",
  description: "1-on-1 Mentor Student Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-900 text-white">
        {children}
      </body>
    </html>
  );
}