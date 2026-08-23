import { createClient } from '@/lib/supabase-server'
import BookingHistoryClient from './BookingHistoryClient'

export default async function BookingHistoryPage({ searchParams }) {
  const supabase = await createClient()
  const { dateFrom, dateTo, staffId } = await searchParams ?? {}

  let editsQuery = supabase
    .from('booking_edits')
    .select('*, profiles:edited_by(full_name), bookings(customer:customers(full_name), room:rooms(room_no))')
    .order('edited_at', { ascending: false })
    .limit(300)

  if (dateFrom) editsQuery = editsQuery.gte('edited_at', dateFrom)
  if (dateTo) editsQuery = editsQuery.lte('edited_at', `${dateTo}T23:59:59`)
  if (staffId) editsQuery = editsQuery.eq('edited_by', staffId)

  const [
    { data: edits },
    { data: staff },
    { data: rooms },
  ] = await Promise.all([
    editsQuery,
    supabase.from('profiles').select('id, full_name').order('full_name'),
    supabase.from('rooms').select('id, room_no'),
  ])

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">ประวัติการแก้ไขการจอง</h1>
        <p className="text-sm text-gray-500 mt-0.5">ตรวจสอบย้อนหลังว่าใครแก้ไขการจองใด แก้อะไร เมื่อไหร่</p>
      </div>
      <BookingHistoryClient
        edits={edits ?? []}
        staff={staff ?? []}
        rooms={rooms ?? []}
        dateFrom={dateFrom ?? ''}
        dateTo={dateTo ?? ''}
        staffId={staffId ?? ''}
      />
    </div>
  )
}
