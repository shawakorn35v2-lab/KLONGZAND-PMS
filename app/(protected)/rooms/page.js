import { createClient } from '@/lib/supabase-server'
import RoomsTable from './RoomsTable'

export default async function RoomsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: rooms }, { data: profile }] = await Promise.all([
    supabase.from('rooms').select('*').order('building').order('room_no'),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
  ])
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">จัดการห้องพัก</h1>
        <p className="text-sm text-gray-500 mt-0.5">19 ห้อง — อาคาร A, B, C</p>
      </div>
      <div className="card p-0 overflow-hidden">
        <RoomsTable rooms={rooms ?? []} isAdmin={isAdmin} />
      </div>
    </div>
  )
}
