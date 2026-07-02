'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { deleteReceipt } from '@/app/actions/receipts'
import { formatDate } from '@/lib/dateUtils'

const PAYMENT_LABELS = { cash: 'เงินสด', transfer: 'โอนเงิน', other: 'อื่นๆ' }
function fmt(n) { return '฿' + Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 }) }

export default function ReceiptsClient({ receipts, total, page, limit, search, isAdmin }) {
  const router = useRouter()
  const [searchInput, setSearchInput] = useState(search ?? '')
  const [deletingId, setDeletingId] = useState(null)

  const totalPages = Math.max(1, Math.ceil((total || 0) / limit))

  function buildUrl(nextPage) {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (nextPage > 1) params.set('page', String(nextPage))
    const qs = params.toString()
    return `/receipts${qs ? '?' + qs : ''}`
  }

  function handleSearch(e) {
    e.preventDefault()
    const params = new URLSearchParams()
    const s = searchInput.trim()
    if (s) params.set('search', s)
    router.push(`/receipts${params.toString() ? '?' + params.toString() : ''}`)
  }

  async function handleDelete(id, receiptNo) {
    if (!confirm(`ลบใบเสร็จ ${receiptNo}?\nการลบไม่สามารถกู้คืนได้`)) return
    setDeletingId(id)
    const result = await deleteReceipt(id)
    setDeletingId(null)
    if (result.error) { alert(result.error); return }
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="card flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="ค้นหาเลขที่ / ชื่อลูกค้า"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="input flex-1 min-w-[200px]"
        />
        <button type="submit" className="btn-primary">ค้นหา</button>
        {search && (
          <button
            type="button"
            onClick={() => { setSearchInput(''); router.push('/receipts') }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            รีเซ็ต
          </button>
        )}
      </form>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-th">เลขที่</th>
                <th className="table-th">วันที่</th>
                <th className="table-th">ชื่อลูกค้า</th>
                <th className="table-th">ช่องทางชำระ</th>
                <th className="table-th text-right">ยอดรับ</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {receipts.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-gray-400 py-8">ไม่มีใบเสร็จ</td>
                </tr>
              )}
              {receipts.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium text-blue-700">{r.receipt_no}</td>
                  <td className="table-td">{formatDate(r.created_at)}</td>
                  <td className="table-td">{r.customer_name || '—'}</td>
                  <td className="table-td text-gray-600">{PAYMENT_LABELS[r.payment_method] ?? '—'}</td>
                  <td className="table-td text-right font-semibold text-green-700">{fmt(r.total_amount)}</td>
                  <td className="table-td">
                    <div className="flex gap-1.5 flex-nowrap justify-end">
                      <Link
                        href={`/receipts/${r.id}`}
                        className="px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-900"
                      >
                        📄 ดู/พิมพ์
                      </Link>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(r.id, r.receipt_no)}
                          disabled={deletingId === r.id}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 text-sm">
          {page > 1 ? (
            <Link href={buildUrl(page - 1)} className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">
              ← ก่อนหน้า
            </Link>
          ) : (
            <span className="px-3 py-1.5 rounded border border-gray-100 text-gray-300">← ก่อนหน้า</span>
          )}
          <span className="text-gray-500">หน้า {page} จาก {totalPages}</span>
          {page < totalPages ? (
            <Link href={buildUrl(page + 1)} className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">
              ถัดไป →
            </Link>
          ) : (
            <span className="px-3 py-1.5 rounded border border-gray-100 text-gray-300">ถัดไป →</span>
          )}
        </div>
      )}
    </div>
  )
}
