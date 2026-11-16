import { listEmployees } from "@/lib/employees"
import { EmployeesManager } from "@/components/admin/employees-manager"

export const dynamic = 'force-dynamic'

export default async function EmpleadasPage() {
    let employees: Awaited<ReturnType<typeof listEmployees>>
    try {
        employees = await listEmployees()
    } catch (error) {
        console.error("Load employees error:", error)
        const detail = error instanceof Error ? (error.cause instanceof Error ? error.cause.message : error.message) : String(error)
        return (
            <div className="p-4 md:p-8 space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Empleadas</h1>
                <p className="text-red-500">No se pudo cargar la lista de empleadas.</p>
                <p className="text-sm text-muted-foreground break-all">Detalle: {detail}</p>
            </div>
        )
    }

    return (
        <div className="h-full flex-1 flex-col space-y-8 p-4 md:p-8 md:flex">
            <EmployeesManager employees={employees} />
        </div>
    )
}
