import { NextResponse } from "next/server"
import QRCode from "qrcode"
import { getSession } from "@/lib/auth"

export async function GET() {
  // Solo admins autenticados pueden ver el QR
  const session = await getSession()
  if (!session?.userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const secret = process.env.TOTP_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: "TOTP_SECRET no está definido en .env.local" },
      { status: 500 }
    )
  }

  // Formato estándar otpauth:// compatible con Google Authenticator, Authy, etc.
  const appName = "Brahneyker Admin"
  const account = "admin"
  const otpauth = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(appName)}&algorithm=SHA1&digits=6&period=30`

  const qrCodeDataURL = await QRCode.toDataURL(otpauth, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 256,
  })

  return NextResponse.json({
    secret,
    otpauth,
    qrCode: qrCodeDataURL,
  })
}
