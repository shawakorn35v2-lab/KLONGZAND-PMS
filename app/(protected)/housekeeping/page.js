import { createClient } from '@/lib/supabase-server'
import HousekeepingClient from './HousekeepingClient'

export default async function HousekeepingPage() {
  const supabase = await createClient()

  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, room_no, building, housekeeping_status, is_active')
    .eq('is_active', true)
    .order('building')
    .order('room_no')

  const { data: logs } = await supabase
    .from('housekeeping_log')
    .select('room_id, status, note, updated_at, updated_by, profiles:updated_by(full_name)')
    .order('updated_at', { ascending: false })
    .limit(300)

  const latestLogs = {}
  ;(logs ?? []).forEach(log => {
    if (!latestLogs[log.room_id]) latestLogs[log.room_id] = log
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ทำความสะอาด</h1>
        <p className="text-sm text-gray-500 mt-0.5">อัปเดตสถานะห้องพักและบันทึก log</p>
      </div>
      <HousekeepingClient rooms={rooms ?? []} latestLogs={latestLogs} />
    </div>
  )
}
