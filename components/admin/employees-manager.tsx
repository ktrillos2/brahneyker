"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { createEmployee, deleteEmployee, moveEmployee, renameEmployee } from "@/app/actions/employees"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Employee {
    id: string
    name: string
}

export function EmployeesManager({ employees }: { employees: Employee[] }) {
    const router = useRouter()
    const [newName, setNewName] = useState("")
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState("")
    const [busy, setBusy] = useState(false)

    const run = async (action: () => Promise<{ error?: string; success?: boolean }>, successMessage?: string) => {
        setBusy(true)
        try {
            const result = await action()
            if (result?.error) {
                toast.error(result.error)
                return false
            }
            if (successMessage) toast.success(successMessage)
            router.refresh()
            return true
        } catch (error) {
            console.error(error)
            toast.error("Ocurrió un error inesperado")
            return false
        } finally {
            setBusy(false)
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newName.trim()) {
            toast.error("Escribe el nombre de la empleada")
            return
        }
        if (await run(() => createEmployee(newName), "Empleada agregada")) setNewName("")
    }

    const handleRename = async (id: string) => {
        if (await run(() => renameEmployee(id, editName), "Nombre actualizado")) setEditingId(null)
    }

    const handleDelete = async (employee: Employee) => {
        if (!confirm(`¿Eliminar a ${employee.name}? Sus servicios y citas anteriores se conservan.`)) return
        await run(() => deleteEmployee(employee.id), "Empleada eliminada")
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Empleadas</h1>
                <p className="text-muted-foreground">
                    Las empleadas aparecen en la agenda de citas, la facturación diaria, los ingresos y el bot de WhatsApp, en este orden.
                </p>
            </div>

            <form onSubmit={handleCreate} className="flex gap-2">
                <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nombre de la nueva empleada"
                    disabled={busy}
                />
                <Button type="submit" disabled={busy}>
                    <Plus className="h-4 w-4 mr-1" /> {busy ? "Guardando..." : "Agregar"}
                </Button>
            </form>

            <div className="border rounded-lg divide-y bg-card">
                {employees.length === 0 && (
                    <p className="p-4 text-sm text-muted-foreground">No hay empleadas registradas.</p>
                )}
                {employees.map((employee, index) => (
                    <div key={employee.id} className="flex items-center gap-3 p-3">
                        <div className="flex flex-col">
                            <button
                                type="button"
                                onClick={() => run(() => moveEmployee(employee.id, -1))}
                                disabled={busy || index === 0}
                                className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                title="Subir"
                            >
                                <ArrowUp className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => run(() => moveEmployee(employee.id, 1))}
                                disabled={busy || index === employees.length - 1}
                                className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                title="Bajar"
                            >
                                <ArrowDown className="h-4 w-4" />
                            </button>
                        </div>

                        {editingId === employee.id ? (
                            <form
                                className="flex flex-1 gap-2"
                                onSubmit={(e) => {
                                    e.preventDefault()
                                    handleRename(employee.id)
                                }}
                            >
                                <Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus disabled={busy} />
                                <Button type="submit" size="icon" disabled={busy || !editName.trim()} title="Guardar">
                                    <Check className="h-4 w-4" />
                                </Button>
                                <Button type="button" size="icon" variant="outline" onClick={() => setEditingId(null)} title="Cancelar">
                                    <X className="h-4 w-4" />
                                </Button>
                            </form>
                        ) : (
                            <>
                                <span className="flex-1 font-medium">{employee.name}</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingId(employee.id)
                                        setEditName(employee.name)
                                    }}
                                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                                    title="Cambiar nombre"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(employee)}
                                    disabled={busy}
                                    className="p-2 rounded-lg hover:bg-muted text-red-500 hover:text-red-700"
                                    title="Eliminar"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </>
                        )}
                    </div>
                ))}
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Cambiar nombre</strong> corrige el nombre de la misma persona: sus citas y servicios anteriores quedan con el nombre nuevo.</p>
                <p><strong>Eliminar</strong> la quita de la lista; sus servicios y citas anteriores se conservan con su nombre en los ingresos y facturas.</p>
            </div>
        </div>
    )
}
