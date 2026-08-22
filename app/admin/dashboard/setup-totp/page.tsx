"use client"

import { useState, useEffect } from "react"
import { Shield, CheckCircle, Copy, Check, RefreshCw } from "lucide-react"
import { OTPInput, REGEXP_ONLY_DIGITS } from "input-otp"
import Link from "next/link"

function OtpSlot({ char, hasFakeCaret, isActive }: { char: string | null; hasFakeCaret: boolean; isActive: boolean }) {
  return (
    <div
      className={`
        relative flex h-14 w-11 items-center justify-center rounded-xl border-2 text-xl font-bold
        transition-all duration-200
        ${isActive ? "border-violet-500 bg-violet-500/10 scale-105" : "border-white/10 bg-white/5"}
        ${char ? "text-white" : "text-white/20"}
      `}
    >
      {char}
      {hasFakeCaret && (
        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 h-0.5 w-4 animate-pulse bg-violet-400 rounded-full" />
      )}
    </div>
  )
}

export default function SetupTotpPage() {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [code, setCode] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [verifyError, setVerifyError] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchSetup()
  }, [])

  const fetchSetup = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/totp/setup")
      if (res.status === 401) {
        setError("No autorizado. Por favor inicia sesión primero.")
        return
      }
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        return
      }
      setQrCode(data.qrCode)
      setSecret(data.secret)
    } catch {
      setError("Error al cargar la configuración TOTP.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (code.length === 6 && !verifying && !verified) {
      handleVerify()
    }
  }, [code])

  const handleVerify = async () => {
    if (code.length !== 6) return
    setVerifying(true)
    setVerifyError("")
    try {
      const res = await fetch("/api/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: code }),
      })
      const data = await res.json()
      if (data.valid) {
        setVerified(true)
      } else {
        setVerifyError("Código incorrecto. Asegúrate de haber escaneado el QR y que tu reloj esté sincronizado.")
        setCode("")
      }
    } catch {
      setVerifyError("Error de conexión.")
      setCode("")
    } finally {
      setVerifying(false)
    }
  }

  const handleCopy = () => {
    if (secret) {
      navigator.clipboard.writeText(secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 mb-4">
            <Shield className="w-8 h-8 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Configuración TOTP</h1>
          <p className="text-white/50 text-sm mt-2">
            Vincula tu app autenticadora para proteger el inventario y las facturas
          </p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-2xl">

          {loading && (
            <div className="flex flex-col items-center gap-4 py-8">
              <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
              <p className="text-white/50 text-sm">Cargando configuración...</p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {!loading && !error && !verified && (
            <>
              {/* Paso 1 */}
              <div className="flex items-start gap-3 mb-6">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-500 text-white text-xs font-bold flex items-center justify-center">1</span>
                <div>
                  <p className="text-white font-medium text-sm">Instala una app autenticadora</p>
                  <p className="text-white/40 text-xs mt-1">
                    Descarga <strong className="text-white/60">Google Authenticator</strong>, <strong className="text-white/60">Authy</strong> o <strong className="text-white/60">Microsoft Authenticator</strong>
                  </p>
                </div>
              </div>

              <div className="border-t border-white/5 my-4" />

              {/* Paso 2 — QR */}
              <div className="flex items-start gap-3 mb-6">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-500 text-white text-xs font-bold flex items-center justify-center">2</span>
                <div className="flex-1">
                  <p className="text-white font-medium text-sm mb-3">Escanea este código QR</p>
                  {qrCode && (
                    <div className="flex justify-center">
                      <div className="p-3 bg-white rounded-xl inline-block shadow-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrCode} alt="QR TOTP" className="w-48 h-48" />
                      </div>
                    </div>
                  )}
                  <p className="text-white/30 text-xs text-center mt-3">
                    ¿No puedes escanear? Ingresa el código manual:
                  </p>
                  <div className="mt-2 flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2 border border-white/5">
                    <code className="text-violet-300 text-xs font-mono flex-1 break-all">{secret}</code>
                    <button onClick={handleCopy} className="flex-shrink-0 text-white/40 hover:text-white transition-colors">
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 my-4" />

              {/* Paso 3 — Verificar */}
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-500 text-white text-xs font-bold flex items-center justify-center">3</span>
                <div className="flex-1">
                  <p className="text-white font-medium text-sm mb-3">
                    Ingresa el código generado para confirmar
                  </p>
                  <div className="flex justify-center mb-4">
                    <OTPInput
                      maxLength={6}
                      value={code}
                      onChange={setCode}
                      disabled={verifying}
                      pattern={REGEXP_ONLY_DIGITS}
                      render={({ slots }) => (
                        <div className="flex gap-2">
                          {slots.map((slot, i) => (
                            <OtpSlot key={i} {...slot} />
                          ))}
                        </div>
                      )}
                    />
                  </div>
                  {verifying && (
                    <p className="text-violet-300 text-xs text-center animate-pulse">Verificando...</p>
                  )}
                  {verifyError && (
                    <p className="text-red-400 text-xs text-center">{verifyError}</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Éxito */}
          {verified && (
            <div className="flex flex-col items-center gap-4 py-6 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white">¡TOTP configurado!</h3>
              <p className="text-white/50 text-sm text-center">
                Tu app autenticadora está correctamente vinculada. Ahora se pedirá el código al acceder al inventario y al generar facturas.
              </p>
              <Link
                href="/admin/dashboard/inventario"
                className="mt-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all"
              >
                Ir al Inventario
              </Link>
            </div>
          )}
        </div>

        {/* Volver */}
        <div className="text-center mt-6">
          <Link href="/admin/dashboard" className="text-sm text-white/30 hover:text-white/60 transition-colors">
            ← Volver al Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
