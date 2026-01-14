import type React from "react"
import type { Metadata } from "next"
import { Inter, Playfair_Display } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" })

export const metadata: Metadata = {
  title: "Salón de Belleza Brahneyker | Cúcuta",
  description:
    "Más de 20 años realzando tu belleza con maestría. Servicios profesionales de cabello y uñas en Cúcuta, Colombia.",
  generator: "v0.app",
  keywords: ["salón de belleza", "Cúcuta", "cabello", "uñas", "Brahneyker", "peluquería"],
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
