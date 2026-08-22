"use client"

import { useState, useEffect, useCallback } from "react"
import { Shield, ShieldCheck, ShieldAlert, KeyRound, Loader2 } from "lucide-react"
import { OTPInput, REGEXP_ONLY_DIGITS } from "input-otp"

// ─── Constantes ────────────────────────────────────────────────────────────────
const SESSION_KEY_PREFIX = "totp_verified_"
const SESSION_DURATION_MS = 5 * 60 * 1000 // 5 minutos

// ─── Tipos ─────────────────────────────────────────────────────────────────────
interface TotpGuardProps {
  /** Clave única para diferenciar qué sección se está protegiendo */
  guardKey: string
  /** Título que se mostrará en la pantalla de verificación */
  title?: string
  /** Descripción que se mostrará bajo el título */
  description?: string
  /** Contenido a proteger — solo se renderiza si el TOTP fue verificado */
  children?: React.ReactNode
  /** Modo inline: solo renderiza el modal, no envuelve el children. Para acción puntual (generar factura) */
  mode?: "page" | "action"
  /** Si mode="action", controla si el guard está abierto */
  open?: boolean
  /** Si mode="action", callback cuando se cancela */
  onCancel?: () => void
  /** Si mode="action", callback cuando se verifica exitosamente */
  onVerified?: () => void
}

// ─── Helper de sesión ───────────────────────────────────────────────────────────
function isVerifiedInSession(key: string): boolean {
  if (typeof window === "undefined") return false
  const raw = sessionStorage.getItem(SESSION_KEY_PREFIX + key)
  if (!raw) return false
  const ts = Number(raw)
  if (isNaN(ts)) return false
  return Date.now() - ts < SESSION_DURATION_MS
}

function markVerifiedInSession(key: string): void {
  sessionStorage.setItem(SESSION_KEY_PREFIX + key, String(Date.now()))
}

// ─── Slot individual del OTP ────────────────────────────────────────────────────
function OtpSlot({ char, hasFakeCaret, isActive }: { char: string | null; hasFakeCaret: boolean; isActive: boolean }) {
  return (
    <div
      className={`
        relative flex h-14 w-12 items-center justify-center rounded-xl border-2 text-xl font-bold
        transition-all duration-200
        ${isActive ? "border-violet-500 bg-violet-500/10 scale-105 shadow-lg shadow-violet-500/20" : "border-white/10 bg-white/5"}
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

// ─── Modal de verificación ──────────────────────────────────────────────────────
function TotpModal({
  title = "Verificación Requerida",
  description = "Ingresa el código de 6 dígitos de tu app autenticadora",
  onVerified,
  onCancel,
  guardKey,
}: {
  title?: string
  description?: string
  onVerified: () => void
  onCancel?: () => void
  guardKey: string
}) {
  const [code, setCode] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [shake, setShake] = useState(false)
  const [attempts, setAttempts] = useState(0)

  const handleVerify = useCallback(async (value: string) => {
    if (value.length !== 6) return
    setStatus("loading")
    setErrorMsg("")

    try {
      const res = await fetch("/api/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: value }),
      })
      const data = await res.json()

      if (data.valid) {
        setStatus("success")
        markVerifiedInSession(guardKey)
        setTimeout(onVerified, 600)
      } else {
        setStatus("error")
        setAttempts((a) => a + 1)
        setErrorMsg(attempts >= 2 ? "Código incorrecto. Asegúrate de que el reloj de tu dispositivo esté sincronizado." : "Código incorrecto. Inténtalo de nuevo.")
        setShake(true)
        setCode("")
        setTimeout(() => setShake(false), 500)
        setTimeout(() => setStatus("idle"), 1500)
      }
    } catch {
      setStatus("error")
      setErrorMsg("Error de conexión. Intenta de nuevo.")
      setShake(true)
      setCode("")
      setTimeout(() => setShake(false), 500)
      setTimeout(() => setStatus("idle"), 1500)
    }
  }, [guardKey, onVerified, attempts])

  // Auto-verify cuando se completan los 6 dígitos
  useEffect(() => {
    if (code.length === 6 && status === "idle") {
      handleVerify(code)
    }
  }, [code, status, handleVerify])

  const statusIcon = {
    idle: <KeyRound className="w-8 h-8 text-violet-400" />,
    loading: <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />,
    error: <ShieldAlert className="w-8 h-8 text-red-400" />,
    success: <ShieldCheck className="w-8 h-8 text-emerald-400" />,
  }[status]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`
          relative w-full max-w-sm rounded-2xl border border-white/10 bg-gray-950/95 p-8 shadow-2xl
          backdrop-blur-xl animate-in zoom-in-95 duration-200
          ${shake ? "animate-shake" : ""}
        `}
        style={shake ? { animation: "shake 0.4s ease" } : {}}
      >
        {/* Icono de estado */}
        <div className="flex justify-center mb-6">
          <div className={`
            p-4 rounded-full border
            ${status === "success" ? "border-emerald-500/30 bg-emerald-500/10" :
              status === "error" ? "border-red-500/30 bg-red-500/10" :
              "border-violet-500/30 bg-violet-500/10"}
            transition-all duration-300
          `}>
            {statusIcon}
          </div>
        </div>

        {/* Textos */}
        <h2 className="text-xl font-bold text-white text-center mb-2">{title}</h2>
        <p className="text-sm text-white/50 text-center mb-8">{description}</p>

        {/* Campo OTP */}
        <div className="flex justify-center mb-6">
          <OTPInput
            maxLength={6}
            value={code}
            onChange={setCode}
            disabled={status === "loading" || status === "success"}
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

        {/* Mensaje de error */}
        {status === "error" && errorMsg && (
          <p className="text-sm text-red-400 text-center mb-4 animate-in fade-in duration-200">
            {errorMsg}
          </p>
        )}

        {/* Éxito */}
        {status === "success" && (
          <p className="text-sm text-emerald-400 text-center mb-4 animate-in fade-in duration-200 font-medium">
            ✓ Verificado. Accediendo...
          </p>
        )}

        {/* Estado cargando */}
        {status === "loading" && (
          <p className="text-sm text-violet-300 text-center mb-4 animate-pulse">
            Verificando código...
          </p>
        )}

        {/* Botón cancelar (solo en modo acción) */}
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={status === "loading" || status === "success"}
            className="w-full mt-2 text-sm text-white/40 hover:text-white/70 transition-colors py-2"
          >
            Cancelar
          </button>
        )}

        {/* Hint */}
        <p className="text-xs text-white/25 text-center mt-4">
          Abre tu app autenticadora y escribe el código de 6 dígitos
        </p>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  )
}

// ─── Componente principal TotpGuard ────────────────────────────────────────────
export function TotpGuard({
  guardKey,
  title,
  description,
  children,
  mode = "page",
  open = false,
  onCancel,
  onVerified,
}: TotpGuardProps) {
  const [verified, setVerified] = useState(false)
  const [checked, setChecked] = useState(false)

  // Verificar sessionStorage al montar
  useEffect(() => {
    setVerified(isVerifiedInSession(guardKey))
    setChecked(true)
  }, [guardKey])

  // ── Modo "page": envuelve y bloquea todo el contenido ──
  if (mode === "page") {
    if (!checked) {
      // Pantalla de carga mínima para evitar parpadeo
      return (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
        </div>
      )
    }

    if (!verified) {
      return (
        <div className="relative min-h-screen">
          {/* Contenido borroso detrás */}
          <div className="blur-sm opacity-30 pointer-events-none select-none">
            {children}
          </div>

          <TotpModal
            guardKey={guardKey}
            title={title}
            description={description}
            onVerified={() => setVerified(true)}
          />
        </div>
      )
    }

    return <>{children}</>
  }

  // ── Modo "action": solo muestra el modal cuando open=true ──
  if (!open) return null

  return (
    <TotpModal
      guardKey={guardKey}
      title={title || "Confirmar acción"}
      description={description || "Ingresa el código TOTP para continuar"}
      onVerified={() => {
        markVerifiedInSession(guardKey)
        onVerified?.()
      }}
      onCancel={onCancel}
    />
  )
}
