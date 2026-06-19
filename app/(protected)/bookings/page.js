import { createClient } from '@/lib/supabase-server'
import BookingsClient from './BookingsClient'

export default async function BookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const today = new Date().toISOString().split('T')[0]

  const [
    { data: bookings },
    { data: rooms },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from('bookings')
      .select('*, room:rooms(room_no, building), customer:customers(full_name, phone), transactions(id, is_closed)')
      .neq('status', 'cancelled')
      .order('checkin_date', { ascending: false })
      .limit(200),
    supabase
      .from('rooms')
      .select('id, room_no, building, price_per_night, is_active, is_monthly')
      .eq('is_active', true)
      .order('room_no'),
    supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single(),
  ])

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">จองห้องพัก</h1>
        <p className="text-sm text-gray-500 mt-0.5">จัดการการจอง เช็คอิน และเช็คเอาท์</p>
      </div>
      <BookingsClient
        bookings={bookings ?? []}
        rooms={rooms ?? []}
        today={today}
        role={profile?.role ?? 'staff'}
        adminName={profile?.full_name ?? ''}
      />
    </div>
  )
}
