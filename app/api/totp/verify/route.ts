import { NextResponse } from "next/server"
import crypto from "crypto"

// ─── TOTP nativo con Node.js crypto (RFC 6238) ─────────────────────────────

function base32Decode(secret: string): Buffer {
  const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  let bits = ""
  for (const char of secret.toUpperCase().replace(/=+$/, "")) {
    const val = base32chars.indexOf(char)
    if (val === -1) continue
    bits += val.toString(2).padStart(5, "0")
  }
  const bytes = bits.match(/.{1,8}/g)?.filter((b) => b.length === 8) ?? []
  return Buffer.from(bytes.map((b) => parseInt(b, 2)))
}

function generateTOTP(secret: string, window: number = 0): string {
  const secretBytes = base32Decode(secret)
  const counter = Math.floor(Date.now() / 1000 / 30) + window
  const counterBuffer = Buffer.alloc(8)
  counterBuffer.writeBigInt64BE(BigInt(counter))

  const hmac = crypto.createHmac("sha1", secretBytes)
  hmac.update(counterBuffer)
  const hash = hmac.digest()

  const offset = hash[hash.length - 1] & 0x0f
  const code =
    (((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff)) %
    1_000_000

  return code.toString().padStart(6, "0")
}

export function verifyTOTP(secret: string, token: string): boolean {
  // Acepta ventana de ±1 periodo (30s) para tolerancia de reloj
  for (const window of [-1, 0, 1]) {
    if (generateTOTP(secret, window) === token.trim()) return true
  }
  return false
}

// ─── Route handler ──────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    const secret = process.env.TOTP_SECRET
    if (!secret) {
      return NextResponse.json(
        { valid: false, error: "TOTP no configurado. Visita /admin/dashboard/setup-totp primero." },
        { status: 500 }
      )
    }

    const isValid = verifyTOTP(secret, String(token))
    return NextResponse.json({ valid: isValid })
  } catch {
    return NextResponse.json({ valid: false, error: "Error al verificar el código" }, { status: 400 })
  }
}
