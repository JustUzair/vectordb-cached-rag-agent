import type { Metadata } from "next";
import { Geist, Geist_Mono, Syne } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// ── Update these once you have a real domain ──────────────
const SITE_URL = "https://tessera.yourdomain.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Tessera | Your documents, assembled into answers",
    template: "%s | Tessera",
  },
  description:
    "Tessera fragments your knowledge into searchable chunks and reassembles them into citation-backed answers. A RAG agent for your documents.",
  keywords: [
    "RAG",
    "retrieval augmented generation",
    "document AI",
    "knowledge base",
    "vector search",
    "AI chat",
    "semantic search",
    "Tessera",
  ],
  authors: [{ name: "Tessera" }],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Tessera",
    title: "Tessera | Your documents, assembled into answers",
    description:
      "Fragment your knowledge. Retrieve with precision. Answers with citations.",
    images: [
      { url: "/og-image.png", width: 1728, height: 1002, alt: "Tessera" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tessera | Your documents, assembled into answers",
    description: "Fragment your knowledge. Retrieve with precision.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning // Required by next-themes
      className={`${geistSans.variable} ${geistMono.variable} ${syne.variable}`}
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
