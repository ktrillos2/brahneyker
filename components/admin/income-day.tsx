"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { Check, Lock, Pencil, Plus, Save, Undo2, X } from "lucide-react"
import { toast } from "sonner"

import { applyDayChanges } from "@/app/actions/daily-operations"
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

interface IncomeDayProps {
    date: string
    columns: string[]
    operations: Operation[]
    productSales: ProductSale[]
    closure: Closure | null
    edits: ClosureEdit[]
    canClose: boolean
}

// Unsaved changes of the edit mode. Kept in localStorage so a closed tab does not lose them.
interface Draft {
    adds: { tempId: string; stylist: string; amount: number }[]
    updates: Record<string, number>
    deletes: string[]
    saleAdds: { tempId: string; product: PickedProduct; quantity: number }[]
    saleDeletes: string[]
}

const emptyDraft = (): Draft => ({ adds: [], updates: {}, deletes: [], saleAdds: [], saleDeletes: [] })

const draftSize = (draft: Draft) =>
    draft.adds.length + Object.keys(draft.updates).length + draft.deletes.length + draft.saleAdds.length + draft.saleDeletes.length

const draftKey = (date: string) => `brahneyker:ingresos-borrador:${date}`

function loadDraft(date: string): Draft | null {
    try {
        const raw = localStorage.getItem(draftKey(date))
        return raw ? { ...emptyDraft(), ...JSON.parse(raw) } : null
    } catch {
        return null
    }
}

function storeDraft(date: string, draft: Draft | null) {
    try {
        if (draft && draftSize(draft) > 0) localStorage.setItem(draftKey(date), JSON.stringify(draft))
        else localStorage.removeItem(draftKey(date))
    } catch {
        // Storage can be unavailable (private mode); the draft then lives only in memory.
    }
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

const iconButton = "h-6 w-6 shrink-0 flex items-center justify-center rounded border text-muted-foreground"

function AmountInput({ stylist, onAdd }: { stylist: string; onAdd: (amount: number) => void }) {
    const [value, setValue] = useState("")
    const amount = parseAmount(value)

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault()
                if (!amount) return
                onAdd(amount)
                setValue("")
            }}
            className="space-y-1"
        >
            <div className="flex gap-1">
                <Input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    inputMode="numeric"
                    placeholder="0"
                    className="h-8 text-sm"
                    aria-label={`Agregar servicio de ${stylist}`}
                />
                <button
                    type="submit"
                    disabled={!amount}
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

interface OperationItemProps {
    op: Operation
    editing: boolean
    draftAmount: number | undefined
    deleted: boolean
    onUpdate: (amount: number) => void
    onDelete: () => void
    onRestore: () => void
}

function OperationItem({ op, editing, draftAmount, deleted, onUpdate, onDelete, onRestore }: OperationItemProps) {
    const [editingValue, setEditingValue] = useState(false)
    const [value, setValue] = useState("")
    const amount = parseAmount(value)
    const billed = op.status === "facturada"
    const shown = draftAmount ?? op.amount

    if (editingValue) {
        return (
            <li>
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        if (!amount) return
                        onUpdate(amount)
                        setEditingValue(false)
                    }}
                    className="space-y-1"
                >
                    <div className="flex gap-1">
                        <Input
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Escape" && setEditingValue(false)}
                            inputMode="numeric"
                            className="h-7 text-sm"
                            autoFocus
                            aria-label="Nuevo valor"
                        />
                        <button type="submit" disabled={!amount} className="shrink-0 h-7 w-7 flex items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40" title="Aceptar">
                            <Check className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => setEditingValue(false)} className="shrink-0 h-7 w-7 flex items-center justify-center rounded-md border" title="Cancelar">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    {amount > 0 && <p className="text-xs text-muted-foreground">= {money(amount)}</p>}
                </form>
            </li>
        )
    }

    return (
        <li className="flex items-center justify-between gap-2 tabular-nums">
            <span className={cn(billed && "text-muted-foreground", deleted && "line-through text-muted-foreground", draftAmount !== undefined && !deleted && "text-primary font-semibold")}>
                {money(shown)}
                {draftAmount !== undefined && !deleted && (
                    <span className="ml-1 text-xs font-normal text-muted-foreground line-through">{money(op.amount)}</span>
                )}
            </span>
            {billed ? (
                <Check className="h-3.5 w-3.5 text-green-600" aria-label="Facturado" />
            ) : editing && deleted ? (
                <button type="button" onClick={onRestore} className={cn(iconButton, "hover:text-primary hover:border-primary")} title="Deshacer eliminación">
                    <Undo2 className="h-3 w-3" />
                </button>
            ) : editing ? (
                <span className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => {
                            setValue(toInputValue(shown))
                            setEditingValue(true)
                        }}
                        className={cn(iconButton, "hover:text-primary hover:border-primary")}
                        title="Editar valor"
                        aria-label={`Editar ${money(shown)} de ${op.stylist}`}
                    >
                        <Pencil className="h-3 w-3" />
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        className={cn(iconButton, "hover:text-red-500 hover:border-red-500")}
                        title="Eliminar"
                        aria-label={`Eliminar ${money(shown)} de ${op.stylist}`}
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
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState<Draft>(emptyDraft)
    const [product, setProduct] = useState<PickedProduct | null>(null)
    const [quantity, setQuantity] = useState("1")
    const [saving, setSaving] = useState(false)
    const [closing, setClosing] = useState(false)
    // Date the in-memory draft belongs to; null until localStorage has been read for this date.
    const [draftDate, setDraftDate] = useState<string | null>(null)
    const locked = closure !== null
    const reasonPrompt = useReasonPrompt()
    const changes = draftSize(draft)

    // Recover a draft left from a previous visit (localStorage is only readable after mount).
    useEffect(() => {
        const saved = loadDraft(date)
        if (saved && draftSize(saved) > 0) {
            setDraft(saved)
            setEditing(true)
            toast.info("Se recuperó un borrador sin guardar de este día")
        } else {
            setDraft(emptyDraft())
            setEditing(false)
        }
        setDraftDate(date)
    }, [date])

    useEffect(() => {
        if (draftDate === date) storeDraft(date, draft)
    }, [date, draftDate, draft])

    const update = (change: (d: Draft) => Draft) => setDraft((d) => change(d))
    const tempId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`

    const discard = () => {
        if (changes > 0 && !confirm(`¿Descartar ${changes} ${changes === 1 ? "cambio" : "cambios"} sin guardar?`)) return
        setDraft(emptyDraft())
        storeDraft(date, null)
        setEditing(false)
    }

    const save = async () => {
        if (changes === 0) {
            setEditing(false)
            return
        }
        let reason: string | undefined
        if (locked) {
            const answer = await reasonPrompt.ask(`${changes} ${changes === 1 ? "cambio" : "cambios"} en el ${dayLabel}`)
            if (!answer) return
            reason = answer
        }
        setSaving(true)
        try {
            const result = await applyDayChanges(date, {
                adds: draft.adds.map(({ stylist, amount }) => ({ stylist, amount })),
                updates: Object.entries(draft.updates).map(([id, amount]) => ({ id, amount })),
                deletes: draft.deletes,
                saleAdds: draft.saleAdds.map(({ product, quantity }) => ({ productId: product.id, quantity })),
                saleDeletes: draft.saleDeletes,
            }, reason)
            if (!result.success) {
                toast.error(result.error)
                return
            }
            setDraft(emptyDraft())
            storeDraft(date, null)
            setEditing(false)
            toast.success("Cambios guardados")
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error("Error al guardar los cambios. El borrador sigue guardado.")
        } finally {
            setSaving(false)
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
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error("Error al cerrar la caja")
        } finally {
            setClosing(false)
        }
    }

    // Totals include the draft so the table shows how the day will look once saved.
    const opAmount = (op: Operation) => (draft.deletes.includes(op.id) ? 0 : draft.updates[op.id] ?? op.amount)
    const byStylist = (name: string) => operations.filter((op) => op.stylist === name)
    const addsOf = (name: string) => draft.adds.filter((a) => a.stylist === name)
    const columnTotal = (name: string) =>
        byStylist(name).reduce((sum, op) => sum + opAmount(op), 0) + addsOf(name).reduce((sum, a) => sum + a.amount, 0)
    const saleTotal = (sale: ProductSale) => (draft.saleDeletes.includes(sale.id) ? 0 : sale.quantity * (sale.productPrice || 0))
    const servicesTotal = columns.reduce((sum, name) => sum + columnTotal(name), 0)
        + operations.filter((op) => !columns.includes(op.stylist)).reduce((sum, op) => sum + opAmount(op), 0)
    const productsTotal = productSales.reduce((sum, sale) => sum + saleTotal(sale), 0)
        + draft.saleAdds.reduce((sum, s) => sum + s.quantity * s.product.price, 0)
    const dayLabel = format(parseISO(date), "EEEE d 'de' MMMM", { locale: es })

    const addSale = (e: React.FormEvent) => {
        e.preventDefault()
        const qty = Number(quantity)
        if (!product || !Number.isInteger(qty) || qty < 1) return
        update((d) => ({ ...d, saleAdds: [...d.saleAdds, { tempId: tempId(), product, quantity: qty }] }))
        setProduct(null)
        setQuantity("1")
    }

    return (
        <div className="space-y-6">
            {reasonPrompt.dialog}

            {locked && closure && (
                <div className="flex items-start gap-3 rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm">
                    <Lock className="h-5 w-5 shrink-0 text-primary" />
                    <div className="space-y-1">
                        <p>
                            <strong>Caja cerrada.</strong> Puedes corregir los valores con el botón Editar; al guardar se pide el motivo y queda registrado.
                            {closure.closedAt && <span className="text-muted-foreground"> Cerrada el {formatTimestamp(closure.closedAt)}</span>}
                        </p>
                        {!editing && closure.servicesTotal + closure.productsTotal !== servicesTotal + productsTotal && (
                            <p className="text-muted-foreground">
                                Total al cerrar: {money(closure.servicesTotal + closure.productsTotal)} · Total actual: {money(servicesTotal + productsTotal)}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {editing ? (
                <div className="sticky top-16 z-20 flex flex-col gap-3 rounded-lg border border-primary bg-card p-3 shadow-lg sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm">
                        <p className="font-semibold">Modo edición</p>
                        <p className="text-muted-foreground">
                            {changes === 0
                                ? "Agrega, corrige o elimina valores. Nada se guarda hasta que presiones Guardar cambios."
                                : `${changes} ${changes === 1 ? "cambio" : "cambios"} sin guardar · el borrador queda guardado en este equipo`}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={discard} disabled={saving}>
                            {changes > 0 ? "Descartar" : "Salir"}
                        </Button>
                        <Button onClick={save} disabled={saving || changes === 0}>
                            <Save className="h-4 w-4 mr-2" />
                            {saving ? "Guardando..." : "Guardar cambios"}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex justify-end">
                    <Button size="lg" onClick={() => setEditing(true)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                    </Button>
                </div>
            )}

            <div className={cn("relative border rounded-lg bg-card overflow-x-auto", editing && "border-primary/60")}>
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="border-b bg-muted/30">
                            {columns.map((name) => (
                                <th key={name} className="min-w-[130px] px-3 py-2 text-left font-semibold border-r">
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
                                            <OperationItem
                                                key={op.id}
                                                op={op}
                                                editing={editing}
                                                draftAmount={draft.updates[op.id]}
                                                deleted={draft.deletes.includes(op.id)}
                                                onUpdate={(amount) => update((d) => {
                                                    const updates = { ...d.updates }
                                                    if (amount === op.amount) delete updates[op.id]
                                                    else updates[op.id] = amount
                                                    return { ...d, updates }
                                                })}
                                                onDelete={() => update((d) => {
                                                    const updates = { ...d.updates }
                                                    delete updates[op.id]
                                                    return { ...d, updates, deletes: [...d.deletes, op.id] }
                                                })}
                                                onRestore={() => update((d) => ({ ...d, deletes: d.deletes.filter((id) => id !== op.id) }))}
                                            />
                                        ))}
                                        {addsOf(name).map((add) => (
                                            <li key={add.tempId} className="flex items-center justify-between gap-2 tabular-nums">
                                                <span className="text-primary font-semibold">
                                                    {money(add.amount)} <span className="text-xs font-normal text-muted-foreground">nuevo</span>
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => update((d) => ({ ...d, adds: d.adds.filter((a) => a.tempId !== add.tempId) }))}
                                                    className={cn(iconButton, "hover:text-red-500 hover:border-red-500")}
                                                    title="Quitar"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                    {editing && (
                                        <AmountInput
                                            stylist={name}
                                            onAdd={(amount) => update((d) => ({ ...d, adds: [...d.adds, { tempId: tempId(), stylist: name, amount }] }))}
                                        />
                                    )}
                                </td>
                            ))}
                            <td className="px-3 py-2">
                                <ul className="space-y-1 mb-3">
                                    {productSales.map((sale) => {
                                        const deleted = draft.saleDeletes.includes(sale.id)
                                        return (
                                            <li key={sale.id} className="flex items-center justify-between gap-2">
                                                <span className={cn("truncate", (sale.status === "facturada" || deleted) && "text-muted-foreground", deleted && "line-through")}>
                                                    {sale.productName ?? "Producto eliminado"}
                                                    {sale.quantity > 1 && <span className="text-muted-foreground"> ×{sale.quantity}</span>}
                                                </span>
                                                <span className={cn("flex items-center gap-2 tabular-nums shrink-0", deleted && "line-through text-muted-foreground")}>
                                                    {money(sale.quantity * (sale.productPrice || 0))}
                                                    {sale.status === "facturada" ? (
                                                        <Check className="h-3.5 w-3.5 text-green-600" aria-label="Facturado" />
                                                    ) : editing && deleted ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => update((d) => ({ ...d, saleDeletes: d.saleDeletes.filter((id) => id !== sale.id) }))}
                                                            className={cn(iconButton, "hover:text-primary hover:border-primary")}
                                                            title="Deshacer eliminación"
                                                        >
                                                            <Undo2 className="h-3 w-3" />
                                                        </button>
                                                    ) : editing ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => update((d) => ({ ...d, saleDeletes: [...d.saleDeletes, sale.id] }))}
                                                            className={cn(iconButton, "hover:text-red-500 hover:border-red-500")}
                                                            title="Eliminar"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    ) : null}
                                                </span>
                                            </li>
                                        )
                                    })}
                                    {draft.saleAdds.map((add) => (
                                        <li key={add.tempId} className="flex items-center justify-between gap-2">
                                            <span className="truncate text-primary font-semibold">
                                                {add.product.name}
                                                {add.quantity > 1 && <span className="font-normal"> ×{add.quantity}</span>}
                                                <span className="ml-1 text-xs font-normal text-muted-foreground">nuevo</span>
                                            </span>
                                            <span className="flex items-center gap-2 tabular-nums shrink-0">
                                                {money(add.quantity * add.product.price)}
                                                <button
                                                    type="button"
                                                    onClick={() => update((d) => ({ ...d, saleAdds: d.saleAdds.filter((s) => s.tempId !== add.tempId) }))}
                                                    className={cn(iconButton, "hover:text-red-500 hover:border-red-500")}
                                                    title="Quitar"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                {editing && (
                                    <form onSubmit={addSale} className="flex gap-1">
                                        <ProductPicker value={product} onChange={setProduct} />
                                        <Input
                                            value={quantity}
                                            onChange={(e) => setQuantity(e.target.value)}
                                            type="number"
                                            min={1}
                                            className="h-8 w-14 text-sm"
                                            aria-label="Cantidad"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!product}
                                            className="shrink-0 h-8 w-8 flex items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"
                                            title="Agregar producto"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>
                                    </form>
                                )}
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
                    <p className="text-sm text-muted-foreground">Total del día{editing && changes > 0 ? " (con borrador)" : ""}</p>
                    <p className="text-2xl font-bold text-primary tabular-nums">{money(servicesTotal + productsTotal)}</p>
                </div>
            </div>

            {!locked && canClose && !editing && (
                <div className="flex justify-end">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button size="lg" variant="outline" disabled={closing}>
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
                                            pero al guardar cada cambio se pedirá <strong className="text-foreground">obligatoriamente el motivo</strong> y quedará registrado.
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
                Presiona Editar para agregar, corregir o eliminar valores y luego Guardar cambios. Escribe los valores en miles como en el cuaderno: 45 = $45.000.
                Los valores con <Check className="inline h-3 w-3 text-green-600" /> ya están facturados y no se pueden cambiar.
            </p>
        </div>
    )
}
