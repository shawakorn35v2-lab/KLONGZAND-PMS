import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { BookingStatusBadge, ChannelBadge } from '@/components/RoomStatusBadge'
import CustomerEditForm from './CustomerEditForm'
import { formatDate } from '@/lib/dateUtils'
function formatCurrency(n) { return '฿' + Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 }) }

export default async function CustomerDetailPage({ params }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()

  if (!customer) notFound()

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, room:rooms(room_no, building)')
    .eq('customer_id', id)
    .order('checkin_date', { ascending: false })

  const totalSpent = (bookings ?? [])
    .filter(b => b.status !== 'cancelled')
    .reduce((s, b) => s + Number(b.price), 0)

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <Link href="/customers" className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-3">
          ← กลับรายชื่อลูกค้า
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{customer.full_name}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">ข้อมูลลูกค้า</h2>
          <CustomerEditForm customer={customer} />
        </div>

        <div className="grid grid-rows-3 gap-4">
          <div className="card text-center">
            <p className="text-xs text-gray-500">จำนวนครั้งที่เข้าพัก</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">
              {(bookings ?? []).filter(b => b.status !== 'cancelled').length}
            </p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-gray-500">ยอดรวมทั้งหมด</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalSpent)}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-gray-500">วันที่สมัคร</p>
            <p className="text-base font-semibold text-gray-700 mt-1">{formatDate(customer.created_at)}</p>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">ประวัติการเข้าพัก ({(bookings ?? []).length} ครั้ง)</h2>
        </div>
        {(bookings ?? []).length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">ยังไม่มีประวัติการเข้าพัก</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th">ห้อง</th>
                  <th className="table-th">เช็คอิน</th>
                  <th className="table-th">เช็คเอาท์</th>
                  <th className="table-th">ช่องทาง</th>
                  <th className="table-th text-right">ราคา</th>
                  <th className="table-th">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="table-td font-medium">{b.room?.room_no ?? '—'}</td>
                    <td className="table-td">{formatDate(b.checkin_date)}</td>
                    <td className="table-td">{formatDate(b.checkout_date)}</td>
                    <td className="table-td"><ChannelBadge channel={b.channel} /></td>
                    <td className="table-td text-right">{formatCurrency(b.price)}</td>
                    <td className="table-td"><BookingStatusBadge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
