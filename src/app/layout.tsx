import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import AppLayout from "@/components/AppLayout";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "EDUING - University",
  description: "Manage your institution on EDUING.in",
  icons: {
    icon: '/bandwlogo.PNG',
    apple: '/bandwlogo.PNG',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-brand-bg text-text-primary`}>
        <ToastProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </ToastProvider>
      </body>
    </html>
  );
}
