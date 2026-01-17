import type React from "react"
import type { Metadata } from "next"
import { Inter, Playfair_Display } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" })

export const metadata: Metadata = {
  metadataBase: new URL('https://brahneyker.com'),
  title: {
    default: "Salón de Belleza Brahneyker | Peluquería y Estética en Cúcuta",
    template: "%s | Brahneyker Salón de Belleza"
  },
  description:
    "Salón de Belleza en Cúcuta con más de 20 años de experiencia. Expertos en balayage, colorimetría, corte de cabello, keratina, manicure y pedicure. ¡Reserva tu cita!",
  keywords: [
    "salón de belleza Cúcuta",
    "peluquería Cúcuta",
    "estilistas en Cúcuta",
    "corte de cabello mujer",
    "balayage Cúcuta",
    "colorimetría experta",
    "keratina",
    "tratamientos capilares",
    "manicure y pedicure",
    "diseño de uñas Cúcuta",
    "maquillaje profesional",
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
    title: "Salón de Belleza Brahneyker | Expertos en Cabello y Uñas en Cúcuta",
    description: "Transforma tu imagen con los mejores estilistas de Cúcuta. Especialistas en color, cortes modernos y cuidado de uñas.",
    url: 'https://brahneyker.com',
    siteName: 'Salón de Belleza Brahneyker',
    locale: 'es_CO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Salón de Belleza Brahneyker | Cúcuta",
    description: "Expertos en belleza y estilismo en Cúcuta. Visítanos en Chapinero, Atalaya.",
    images: ["/images/freepik-background-93643.png"],
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
