"use client"

import { useRef, useState } from "react"
import { Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

// Asks for the mandatory reason before changing a day whose cash register is closed.
// `ask(change)` resolves with the reason, or null if the person cancels.
export function useReasonPrompt() {
    const [change, setChange] = useState<string | null>(null)
    const [reason, setReason] = useState("")
    const resolver = useRef<((value: string | null) => void) | null>(null)

    const finish = (value: string | null) => {
        resolver.current?.(value)
        resolver.current = null
        setChange(null)
    }

    const ask = (description: string) =>
        new Promise<string | null>((resolve) => {
            resolver.current = resolve
            setReason("")
            setChange(description)
        })

    const dialog = (
        <Dialog open={change !== null} onOpenChange={(open) => !open && finish(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-primary" />
                        La caja de este día está cerrada
                    </DialogTitle>
                    <DialogDescription>
                        Cambio: <strong className="text-foreground">{change}</strong>. Escribe el motivo; quedará registrado.
                    </DialogDescription>
                </DialogHeader>
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        if (reason.trim()) finish(reason.trim())
                    }}
                    className="space-y-4"
                >
                    <Textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Motivo del cambio (obligatorio)"
                        autoFocus
                        aria-label="Motivo del cambio"
                    />
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => finish(null)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={!reason.trim()}>
                            Guardar cambio
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )

    return { ask, dialog }
}
