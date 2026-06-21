import { createClient } from '@/lib/supabase-server'
import InventoryClient from './InventoryClient'

export default async function InventoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: items },
    { data: movements },
    { data: requests },
    { data: rooms },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from('inventory_items')
      .select('*')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('inventory_movements')
      .select('*, item:inventory_items(name, unit), room:rooms(room_no), creator:profiles!created_by(full_name), tx:transactions(amount)')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('inventory_requests')
      .select('*, item:inventory_items(name, unit), requester:profiles!requested_by(full_name), resolver:profiles!resolved_by(full_name)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('rooms')
      .select('id, room_no, building')
      .eq('is_active', true)
      .order('room_no'),
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single(),
  ])

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">สต๊อกของใช้</h1>
        <p className="text-sm text-gray-500 mt-0.5">จัดการของใช้ รับเข้า เบิกออก และคำขอเพิ่มเติม</p>
      </div>
      <InventoryClient
        items={items ?? []}
        movements={movements ?? []}
        requests={requests ?? []}
        rooms={rooms ?? []}
        role={profile?.role ?? 'staff'}
      />
    </div>
  )
}
