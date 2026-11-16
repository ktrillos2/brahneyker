import { listEmployees } from "@/lib/employees"
import { EmployeesManager } from "@/components/admin/employees-manager"

export const dynamic = 'force-dynamic'

export default async function EmpleadasPage() {
    const employees = await listEmployees()

    return (
        <div className="h-full flex-1 flex-col space-y-8 p-4 md:p-8 md:flex">
            <EmployeesManager employees={employees} />
        </div>
    )
}
