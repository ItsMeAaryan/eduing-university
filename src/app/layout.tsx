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
  metadataBase: new URL('https://university.eduing.in'),
  title: {
    default: "EDUING - University Portal",
    template: "%s | EDUING",
  },
  description: "Manage your institution on EDUING.in",
  icons: {
    icon: '/bandwlogo.PNG',
    apple: '/bandwlogo.PNG',
  },
  // This is an authenticated staff/admin portal — most routes have nothing
  // for search engines to usefully index and shouldn't appear in search
  // results. Per-route opt-outs and the public exception (auth/register)
  // are handled in robots.txt and each route's own metadata below.
  robots: {
    index: false,
    follow: false,
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
