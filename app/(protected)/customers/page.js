import { createClient } from '@/lib/supabase-server'
import CustomersClient from './CustomersClient'

export default async function CustomersPage() {
  const supabase = await createClient()
  const { data: customers } = await supabase
    .from('customers')
    .select('id, full_name, phone, note, created_at')
    .order('full_name')

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ลูกค้า</h1>
        <p className="text-sm text-gray-500 mt-0.5">{(customers ?? []).length} รายการ</p>
      </div>
      <CustomersClient customers={customers ?? []} />
    </div>
  )
}
