"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { Check, Lock, Pencil, Plus, X } from "lucide-react"
import { toast } from "sonner"

import {
    addDailyOperation,
    addDailyProductSale,
    deleteDailyOperation,
    deleteDailyProductSale,
    updateDailyOperationAmount,
} from "@/app/actions/daily-operations"
import { closeDay } from "@/app/actions/closures"
import { ProductPicker, type PickedProduct } from "./product-picker"
import { useReasonPrompt } from "./reason-dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface Operation {
    id: string
    stylist: string
    clientName: string | null
    description: string
    amount: number
    status: string
}

interface ProductSale {
    id: string
    quantity: number
    status: string
    productName: string | null
    productPrice: number | null
}

interface Closure {
    closedAt: string | null
    servicesTotal: number
    productsTotal: number
}

interface ClosureEdit {
    id: string
    description: string
    reason: string
    createdAt: string | null
}

// On a closed day every change needs a reason; on an open day it goes through directly.
type RequestReason = (change: string) => Promise<{ ok: boolean; reason?: string }>

interface IncomeDayProps {
    date: string
    columns: string[]
    operations: Operation[]
    productSales: ProductSale[]
    closure: Closure | null
    edits: ClosureEdit[]
    canClose: boolean
}

export const money = (value: number) => `$${Math.round(value).toLocaleString("es-CO")}`

// Amounts are written in thousands like on paper: "45" means $45.000.
export function parseAmount(raw: string) {
    const value = Number(raw.replace(/[^\d]/g, ""))
    if (!value) return 0
    return value < 1000 ? value * 1000 : value
}

// SQLite CURRENT_TIMESTAMP is UTC; show it in Bogotá time (also on the server, to avoid hydration mismatches).
const formatTimestamp = (value: string) =>
    new Date(value.replace(" ", "T") + "Z").toLocaleString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })

// Inverse of parseAmount, to prefill the edit input the same way it is typed.
const toInputValue = (amount: number) => String(amount % 1000 === 0 && amount < 1_000_000 ? amount / 1000 : amount)

function AmountInput({ stylist, date, onAdded, requestReason }: { stylist: string; date: string; onAdded: () => void; requestReason: RequestReason }) {
    const [value, setValue] = useState("")
    const [saving, setSaving] = useState(false)
    const amount = parseAmount(value)

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!amount || saving) return
        const gate = await requestReason(`Agregar ${money(amount)} a ${stylist}`)
        if (!gate.ok) return
        setSaving(true)
        try {
            const result = await addDailyOperation({ stylist, date, amount, description: "Servicio" }, gate.reason)
            if (!result.success) {
                toast.error(result.error)
                return
            }
            setValue("")
            onAdded()
        } catch (error) {
            console.error(error)
            toast.error("Error al registrar servicio")
        } finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={submit} className="space-y-1">
            <div className="flex gap-1">
                <Input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    inputMode="numeric"
                    placeholder="0"
                    className="h-8 text-sm"
                    disabled={saving}
                    aria-label={`Agregar servicio de ${stylist}`}
                />
                <button
                    type="submit"
                    disabled={!amount || saving}
                    className="shrink-0 h-8 w-8 flex items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"
                    title="Agregar"
                >
                    <Plus className="h-4 w-4" />
                </button>
            </div>
            {amount > 0 && <p className="text-xs text-muted-foreground">= {money(amount)}</p>}
        </form>
    )
}

function OperationItem({ op, locked, onChanged, requestReason }: { op: Operation; locked: boolean; onChanged: () => void; requestReason: RequestReason }) {
    const [editing, setEditing] = useState(false)
    const [value, setValue] = useState("")
    const [saving, setSaving] = useState(false)
    const editable = op.status !== "facturada"
    const amount = parseAmount(value)

    const save = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!amount || saving) return
        if (amount === op.amount) {
            setEditing(false)
            return
        }
        const gate = await requestReason(`Cambiar ${op.stylist} de ${money(op.amount)} a ${money(amount)}`)
        if (!gate.ok) return
        setSaving(true)
        try {
            const result = await updateDailyOperationAmount(op.id, amount, gate.reason)
            if (!result.success) {
                toast.error(result.error)
                return
            }
            setEditing(false)
            onChanged()
        } catch (error) {
            console.error(error)
            toast.error("Error al actualizar el valor")
        } finally {
            setSaving(false)
        }
    }

    const remove = async () => {
        // On a closed day the reason dialog is the confirmation.
        if (!locked && !confirm(`¿Eliminar el servicio de ${op.stylist} por ${money(op.amount)}?`)) return
        const gate = await requestReason(`Eliminar ${money(op.amount)} de ${op.stylist}`)
        if (!gate.ok) return
        try {
            const result = await deleteDailyOperation(op.id, gate.reason)
            if (!result.success) {
                toast.error(result.error)
                return
            }
            onChanged()
        } catch (error) {
            console.error(error)
            toast.error("Error al eliminar servicio")
        }
    }

    if (editing) {
        return (
            <li>
                <form onSubmit={save} className="space-y-1">
                    <div className="flex gap-1">
                        <Input
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
                            inputMode="numeric"
                            className="h-7 text-sm"
                            autoFocus
                            disabled={saving}
                            aria-label="Nuevo valor"
                        />
                        <button type="submit" disabled={!amount || saving} className="shrink-0 h-7 w-7 flex items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40" title="Guardar">
                            <Check className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => setEditing(false)} className="shrink-0 h-7 w-7 flex items-center justify-center rounded-md border" title="Cancelar">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    {amount > 0 && <p className="text-xs text-muted-foreground">= {money(amount)}</p>}
                </form>
            </li>
        )
    }

    return (
        <li
            className="group flex items-center justify-between gap-2 tabular-nums"
            title={[op.description, op.clientName].filter(Boolean).join(" · ")}
        >
            {editable ? (
                <button
                    type="button"
                    onClick={() => {
                        setValue(toInputValue(op.amount))
                        setEditing(true)
                    }}
                    className="hover:text-primary hover:underline underline-offset-2"
                >
                    {money(op.amount)}
                </button>
            ) : (
                <span className={cn(op.status === "facturada" && "text-muted-foreground")}>{money(op.amount)}</span>
            )}
            {op.status === "facturada" ? (
                <Check className="h-3.5 w-3.5 text-green-600" aria-label="Facturado" />
            ) : editable ? (
                <span className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => {
                            setValue(toInputValue(op.amount))
                            setEditing(true)
                        }}
                        className="h-6 w-6 flex items-center justify-center rounded border text-muted-foreground hover:text-primary hover:border-primary"
                        title="Editar valor"
                        aria-label={`Editar ${money(op.amount)} de ${op.stylist}`}
                    >
                        <Pencil className="h-3 w-3" />
                    </button>
                    <button
                        type="button"
                        onClick={remove}
                        className="h-6 w-6 flex items-center justify-center rounded border text-muted-foreground hover:text-red-500 hover:border-red-500"
                        title="Eliminar"
                        aria-label={`Eliminar ${money(op.amount)} de ${op.stylist}`}
                    >
                        <X className="h-3 w-3" />
                    </button>
                </span>
            ) : null}
        </li>
    )
}

export function IncomeDay({ date, columns, operations, productSales, closure, edits, canClose }: IncomeDayProps) {
    const router = useRouter()
    const [product, setProduct] = useState<PickedProduct | null>(null)
    const [quantity, setQuantity] = useState("1")
    const [busy, setBusy] = useState(false)
    const [closing, setClosing] = useState(false)
    const locked = closure !== null
    const reasonPrompt = useReasonPrompt()

    const refresh = () => router.refresh()

    const requestReason: RequestReason = async (change) => {
        if (!locked) return { ok: true }
        const reason = await reasonPrompt.ask(change)
        return reason ? { ok: true, reason } : { ok: false }
    }

    const removeSale = async (sale: ProductSale) => {
        if (!locked && !confirm(`¿Eliminar la venta de ${sale.productName ?? "producto"}?`)) return
        const gate = await requestReason(`Eliminar venta de ${sale.productName ?? "producto"} ×${sale.quantity}`)
        if (!gate.ok) return
        try {
            const result = await deleteDailyProductSale(sale.id, gate.reason)
            if (!result.success) {
                toast.error(result.error)
                return
            }
            refresh()
        } catch (error) {
            console.error(error)
            toast.error("Error al eliminar venta")
        }
    }

    const addSale = async (e: React.FormEvent) => {
        e.preventDefault()
        const qty = Number(quantity)
        if (!product || !qty || qty < 1) return
        const gate = await requestReason(`Agregar venta de ${product.name} ×${qty}`)
        if (!gate.ok) return
        setBusy(true)
        try {
            const result = await addDailyProductSale({ productId: product.id, quantity: qty, date }, gate.reason)
            if (!result.success) {
                toast.error(result.error)
                return
            }
            setProduct(null)
            setQuantity("1")
            refresh()
        } catch (error) {
            console.error(error)
            toast.error("Error al registrar venta")
        } finally {
            setBusy(false)
        }
    }

    const handleClose = async () => {
        setClosing(true)
        try {
            const result = await closeDay(date)
            if (result.error) {
                toast.error(result.error)
                return
            }
            toast.success("Caja cerrada")
            refresh()
        } catch (error) {
            console.error(error)
            toast.error("Error al cerrar la caja")
        } finally {
            setClosing(false)
        }
    }

    const byStylist = (name: string) => operations.filter((op) => op.stylist === name)
    const columnTotal = (name: string) => byStylist(name).reduce((sum, op) => sum + op.amount, 0)
    const saleTotal = (sale: ProductSale) => sale.quantity * (sale.productPrice || 0)
    const servicesTotal = operations.reduce((sum, op) => sum + op.amount, 0)
    const productsTotal = productSales.reduce((sum, sale) => sum + saleTotal(sale), 0)
    const dayLabel = format(parseISO(date), "EEEE d 'de' MMMM", { locale: es })

    return (
        <div className="space-y-6">
            {reasonPrompt.dialog}

            {locked && closure && (
                <div className="flex items-start gap-3 rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm">
                    <Lock className="h-5 w-5 shrink-0 text-primary" />
                    <div className="space-y-1">
                        <p>
                            <strong>Caja cerrada.</strong> Puedes corregir los valores, pero cada cambio pide un motivo y queda registrado.
                            {closure.closedAt && <span className="text-muted-foreground"> Cerrada el {formatTimestamp(closure.closedAt)}</span>}
                        </p>
                        {closure.servicesTotal + closure.productsTotal !== servicesTotal + productsTotal && (
                            <p className="text-muted-foreground">
                                Total al cerrar: {money(closure.servicesTotal + closure.productsTotal)} · Total actual: {money(servicesTotal + productsTotal)}
                            </p>
                        )}
                    </div>
                </div>
            )}

            <div className="relative border rounded-lg bg-card overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="border-b bg-muted/30">
                            {columns.map((name) => (
                                <th key={name} className="min-w-[120px] px-3 py-2 text-left font-semibold border-r">
                                    {name}
                                </th>
                            ))}
                            <th className="min-w-[240px] px-3 py-2 text-left font-semibold">Productos</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="align-top">
                            {columns.map((name) => (
                                <td key={name} className="px-3 py-2 border-r">
                                    <ul className="space-y-1 mb-3">
                                        {byStylist(name).map((op) => (
                                            <OperationItem key={op.id} op={op} locked={locked} onChanged={refresh} requestReason={requestReason} />
                                        ))}
                                    </ul>
                                    <AmountInput stylist={name} date={date} onAdded={refresh} requestReason={requestReason} />
                                </td>
                            ))}
                            <td className="px-3 py-2">
                                <ul className="space-y-1 mb-3">
                                    {productSales.map((sale) => (
                                        <li key={sale.id} className="group flex items-center justify-between gap-2">
                                            <span className={cn("truncate", sale.status === "facturada" && "text-muted-foreground")}>
                                                {sale.productName ?? "Producto eliminado"}
                                                {sale.quantity > 1 && <span className="text-muted-foreground"> ×{sale.quantity}</span>}
                                            </span>
                                            <span className="flex items-center gap-2 tabular-nums shrink-0">
                                                {money(saleTotal(sale))}
                                                {sale.status === "facturada" ? (
                                                    <Check className="h-3.5 w-3.5 text-green-600" aria-label="Facturado" />
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeSale(sale)}
                                                        className="h-6 w-6 flex items-center justify-center rounded border text-muted-foreground hover:text-red-500 hover:border-red-500"
                                                        title="Eliminar"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                )}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                <form onSubmit={addSale} className="flex gap-1">
                                    <ProductPicker value={product} onChange={setProduct} disabled={busy} />
                                    <Input
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        type="number"
                                        min={1}
                                        className="h-8 w-14 text-sm"
                                        aria-label="Cantidad"
                                        disabled={busy}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!product || busy}
                                        className="shrink-0 h-8 w-8 flex items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"
                                        title="Agregar producto"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </form>
                            </td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 bg-muted/30 font-bold tabular-nums">
                            {columns.map((name) => (
                                <td key={name} className="px-3 py-2 border-r">{money(columnTotal(name))}</td>
                            ))}
                            <td className="px-3 py-2">{money(productsTotal)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border bg-card p-4">
                    <p className="text-sm text-muted-foreground">Servicios</p>
                    <p className="text-2xl font-bold tabular-nums">{money(servicesTotal)}</p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                    <p className="text-sm text-muted-foreground">Productos</p>
                    <p className="text-2xl font-bold tabular-nums">{money(productsTotal)}</p>
                </div>
                <div className="rounded-lg border bg-primary/10 p-4">
                    <p className="text-sm text-muted-foreground">Total del día</p>
                    <p className="text-2xl font-bold text-primary tabular-nums">{money(servicesTotal + productsTotal)}</p>
                </div>
            </div>

            {!locked && canClose && (
                <div className="flex justify-end">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button size="lg" disabled={closing}>
                                <Lock className="h-4 w-4 mr-2" />
                                {closing ? "Cerrando..." : "Cerrar caja"}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Cerrar la caja del {dayLabel}?</AlertDialogTitle>
                                <AlertDialogDescription asChild>
                                    <div className="space-y-2">
                                        <p>
                                            Servicios {money(servicesTotal)} + Productos {money(productsTotal)} ={" "}
                                            <strong className="text-foreground">{money(servicesTotal + productsTotal)}</strong>
                                        </p>
                                        <p>
                                            Después de cerrar, los valores de este día <strong className="text-foreground">sí se pueden corregir</strong>,
                                            pero cada cambio (agregar, editar o eliminar) pedirá <strong className="text-foreground">obligatoriamente el motivo</strong> y quedará registrado.
                                        </p>
                                    </div>
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleClose}>Sí, cerrar caja</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}

            {edits.length > 0 && (
                <div className="rounded-lg border bg-card p-4 space-y-2">
                    <p className="text-sm font-semibold">Cambios después del cierre</p>
                    <ul className="space-y-2 text-sm">
                        {edits.map((edit) => (
                            <li key={edit.id} className="border-l-2 border-primary/50 pl-3">
                                <p>{edit.description}</p>
                                <p className="text-muted-foreground">
                                    Motivo: {edit.reason}
                                    {edit.createdAt && <> · {formatTimestamp(edit.createdAt)}</>}
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <p className="text-xs text-muted-foreground">
                Escribe los valores en miles como en el cuaderno: 45 = $45.000. Para corregir un valor usa el lápiz o haz clic sobre él.
                Los valores con <Check className="inline h-3 w-3 text-green-600" /> ya están facturados.
            </p>
        </div>
    )
}
