import type React from "react"
import type { Metadata } from "next"
import { Inter, Playfair_Display } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" })

export const metadata: Metadata = {
  metadataBase: new URL('https://brahneyker.com'), // Replace with actual domain when known or use VERCEL_URL logic in separate file if strict
  title: {
    default: "Salón de Belleza Brahneyker | Expertos en Cabello y Uñas en Cúcuta",
    template: "%s | Brahneyker Salón de Belleza"
  },
  description:
    "Descubre Brahneyker en Cúcuta. Más de 20 años de experiencia transformando tu estilo. Especialistas en cortes, colorimetría, balayage, keratina y diseño de uñas.",
  keywords: [
    "salón de belleza Cúcuta",
    "peluquería Cúcuta",
    "estilistas profesionales",
    "manicura y pedicura",
    "balayage",
    "colorimetría",
    "corte de cabello mujer",
    "keratina",
    "uñas acrílicas",
    "Brahneyker"
  ],
  authors: [{ name: "Brahneyker Team" }],
  creator: "Brahneyker",
  publisher: "Brahneyker",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Salón de Belleza Brahneyker | Tu mejor versión",
    description: "Expertos en realzar tu belleza. Servicios premium de peluquería y estética en Cúcuta.",
    url: 'https://brahneyker.com',
    siteName: 'Salón de Belleza Brahneyker',
    locale: 'es_CO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Salón de Belleza Brahneyker",
    description: "Transformamos tu estilo con profesionalismo y pasión en Cúcuta.",
    creator: "@brahneyker", // Placeholder if they have one
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: "/images/freepik-background-93643.png",
    shortcut: "/images/freepik-background-93643.png",
    apple: "/images/freepik-background-93643.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
