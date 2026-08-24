import type { Metadata, Viewport } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthProviders } from "@/components/providers/auth-providers";
import { ClientSettingsProvider } from "@/components/providers/client-settings-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ErrorBoundary } from "@/components/providers/error-boundary";

export const metadata: Metadata = {
  title: "ASCENDRA — Forge Your Legend",
  description: "A AAA productivity RPG for your life",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png" }
    ],
  },
  openGraph: {
    title: "ASCENDRA — Forge Your Legend",
    description: "A AAA productivity RPG for your life",
    images: [{ url: "/logo.png" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ASCENDRA — Forge Your Legend",
    description: "A AAA productivity RPG for your life",
    images: ["/logo.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ASCENDRA",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F172A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground min-h-screen">
        <ErrorBoundary>
          <AuthProviders>
            <QueryProvider>
              <ThemeProvider>
                <ClientSettingsProvider>
                  {children}
                </ClientSettingsProvider>
              </ThemeProvider>
            </QueryProvider>
          </AuthProviders>
        </ErrorBoundary>
      </body>
    </html>
  );
}
