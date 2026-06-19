import { createClient } from '@/lib/supabase-server'
import RoomsTable from './RoomsTable'

export default async function RoomsPage() {
  const supabase = await createClient()
  const { data: rooms } = await supabase
    .from('rooms')
    .select('*')
    .order('building')
    .order('room_no')

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">จัดการห้องพัก</h1>
        <p className="text-sm text-gray-500 mt-0.5">19 ห้อง — อาคาร A, B, C</p>
      </div>
      <div className="card p-0 overflow-hidden">
        <RoomsTable rooms={rooms ?? []} />
      </div>
    </div>
  )
}
