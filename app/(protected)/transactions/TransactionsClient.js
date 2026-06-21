'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TransactionForm from '@/components/TransactionForm'
import DailyCloseButton from '@/components/DailyCloseButton'
import ExportButtons from '@/components/ExportButtons'
import { TxTypeBadge } from '@/components/RoomStatusBadge'
import { deleteTransaction } from '@/app/actions/transactions'
import { sellItem } from '@/app/actions/inventory'
import { formatDate } from '@/lib/dateUtils'
function formatCurrency(n) { return '฿' + Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 }) }

const EXPORT_COLS = [
  { key: 'tx_date', header: 'วันที่', format: 'date' },
  { key: 'tx_type', header: 'ประเภท', format: 'txtype' },
  { key: 'category', header: 'หมวดหมู่' },
  { key: 'amount', header: 'จำนวนเงิน', format: 'number2' },
  { key: 'note', header: 'หมายเหตุ', format: 'nullable' },
]

export default function TransactionsClient({
  transactions, today, from, to,
  todayIncome, todayExpense, alreadyClosed, closedDates, saleItems,
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [fromDate, setFromDate] = useState(from)
  const [toDate, setToDate] = useState(to)
  const [deletingId, setDeletingId] = useState(null)

  // บันทึกขายของ
  const [showSellForm, setShowSellForm] = useState(false)
  const [sellForm, setSellForm] = useState({ item_id: '', quantity: '' })
  const [sellLoading, setSellLoading] = useState(false)
  const [sellError, setSellError] = useState('')

  function applyFilter() {
    router.push(`/transactions?dateFrom=${fromDate}&dateTo=${toDate}`)
  }

  async function handleDelete(id, txDate) {
    if (!confirm('ลบรายการนี้?')) return
    setDeletingId(id)
    const result = await deleteTransaction(id, txDate)
    setDeletingId(null)
    if (result.error) alert(result.error)
    else router.refresh()
  }

  const selectedSaleItem = saleItems.find(i => i.id === sellForm.item_id)
  const sellTotal = selectedSaleItem && Number(sellForm.quantity) > 0
    ? Number(selectedSaleItem.sale_price) * Number(sellForm.quantity)
    : null
  const sellOverStock = selectedSaleItem && Number(sellForm.quantity) > 0
    && Number(sellForm.quantity) > Number(selectedSaleItem.current_stock)

  async function handleSell(e) {
    e.preventDefault()
    setSellError('')
    if (!sellForm.item_id) { setSellError('กรุณาเลือกสินค้า'); return }
    if (!sellForm.quantity || Number(sellForm.quantity) <= 0) { setSellError('กรุณากรอกจำนวน'); return }
    if (sellOverStock) {
      setSellError(`สต๊อกไม่พอ — มีอยู่ ${Number(selectedSaleItem.current_stock).toLocaleString('th-TH')} ${selectedSaleItem.unit}`)
      return
    }
    setSellLoading(true)
    const result = await sellItem({ item_id: sellForm.item_id, quantity: sellForm.quantity })
    setSellLoading(false)
    if (result.error) { setSellError(result.error); return }
    setSellForm({ item_id: '', quantity: '' })
    setShowSellForm(false)
    router.refresh()
  }

  const totalIncome = transactions.filter(t => t.tx_type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = transactions.filter(t => t.tx_type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card border-t-4 border-t-green-500">
          <p className="text-xs font-semibold text-gray-500 uppercase">รายรับวันนี้</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(todayIncome)}</p>
        </div>
        <div className="card border-t-4 border-t-red-500">
          <p className="text-xs font-semibold text-gray-500 uppercase">รายจ่ายวันนี้</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(todayExpense)}</p>
        </div>
        <div className={`card border-t-4 ${todayIncome - todayExpense >= 0 ? 'border-t-blue-500' : 'border-t-red-500'}`}>
          <p className="text-xs font-semibold text-gray-500 uppercase">กำไรสุทธิวันนี้</p>
          <p className={`text-2xl font-bold mt-1 ${todayIncome - todayExpense >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {formatCurrency(todayIncome - todayExpense)}
          </p>
        </div>
      </div>

      {/* Actions row */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => { setShowForm(!showForm); setShowSellForm(false) }} className="btn-primary">
          {showForm ? '✕ ปิดฟอร์ม' : '+ เพิ่มรายการ'}
        </button>
        {saleItems.length > 0 && (
          <button
            onClick={() => { setShowSellForm(!showSellForm); setShowForm(false); setSellError(''); setSellForm({ item_id: '', quantity: '' }) }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors">
            {showSellForm ? '✕ ปิด' : '🛒 บันทึกขายของ'}
          </button>
        )}
        <DailyCloseButton
          date={today}
          alreadyClosed={alreadyClosed}
          totalIncome={todayIncome}
          totalExpense={todayExpense}
        />
        <div className="flex-1" />
        <ExportButtons
          data={transactions}
          filename={`รายรับ-รายจ่าย-${from}-ถึง-${to}`}
          title={`รายรับ-รายจ่าย ${from} ถึง ${to}`}
          columns={EXPORT_COLS}
        />
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card max-w-md">
          <h2 className="text-base font-semibold text-gray-900 mb-4">เพิ่มรายการ</h2>
          <TransactionForm onClose={() => setShowForm(false)} />
        </div>
      )}

      {/* Sell form */}
      {showSellForm && (
        <div className="card max-w-md border-l-4 border-purple-500">
          <h2 className="text-base font-semibold text-gray-900 mb-4">🛒 บันทึกขายของ</h2>
          <form onSubmit={handleSell} className="space-y-3">
            <div>
              <label className="label">สินค้า *</label>
              <select required value={sellForm.item_id}
                onChange={e => setSellForm(p => ({ ...p, item_id: e.target.value, quantity: '' }))}
                className="input">
                <option value="">-- เลือกสินค้า --</option>
                {saleItems.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.name} — คงเหลือ {Number(i.current_stock).toLocaleString('th-TH')} {i.unit} — ฿{Number(i.sale_price).toLocaleString('th-TH')}/{i.unit}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">จำนวนที่ขาย *</label>
              <input type="number" required min="0.01" step="0.01"
                value={sellForm.quantity}
                onChange={e => setSellForm(p => ({ ...p, quantity: e.target.value }))}
                className={`input ${sellOverStock ? 'border-red-400 bg-red-50' : ''}`}
                placeholder="0" />
              {sellOverStock && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠ เกินสต๊อกที่มีอยู่ ({Number(selectedSaleItem.current_stock).toLocaleString('th-TH')} {selectedSaleItem.unit})
                </p>
              )}
            </div>
            {sellTotal !== null && !sellOverStock && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 flex justify-between items-center text-sm">
                <span className="text-gray-600">ยอดรวม</span>
                <span className="font-bold text-purple-700 text-base">
                  ฿{sellTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {sellError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{sellError}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={sellLoading || sellOverStock || !sellForm.quantity}
                className="btn-primary disabled:opacity-50">
                {sellLoading ? 'กำลังบันทึก...' : '🛒 บันทึก'}
              </button>
              <button type="button" onClick={() => setShowSellForm(false)} className="btn-secondary">ยกเลิก</button>
            </div>
          </form>
        </div>
      )}

      {/* Date filter */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-700">กรองช่วงวันที่:</span>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input max-w-[160px]" />
          <span className="text-gray-500 text-sm">ถึง</span>
          <input type="date" value={toDate} max={today} onChange={e => setToDate(e.target.value)} className="input max-w-[160px]" />
          <button onClick={applyFilter} className="btn-secondary">ค้นหา</button>
          <button onClick={() => { setFromDate(today); setToDate(today); router.push('/transactions') }} className="text-sm text-gray-500 hover:text-gray-700">
            รีเซ็ต
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <span>รายรับรวม: <strong className="text-green-600">{formatCurrency(totalIncome)}</strong></span>
          <span>รายจ่ายรวม: <strong className="text-red-600">{formatCurrency(totalExpense)}</strong></span>
          <span>กำไรสุทธิ: <strong className={totalIncome - totalExpense >= 0 ? 'text-blue-600' : 'text-red-600'}>{formatCurrency(totalIncome - totalExpense)}</strong></span>
        </div>
      </div>

      {/* Transactions table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-th">วันที่</th>
                <th className="table-th">ประเภท</th>
                <th className="table-th">หมวดหมู่</th>
                <th className="table-th text-right">จำนวนเงิน</th>
                <th className="table-th">หมายเหตุ</th>
                <th className="table-th">สถานะ</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 && (
                <tr><td colSpan={7} className="text-center text-gray-400 py-8">ไม่มีรายการ</td></tr>
              )}
              {transactions.map(t => (
                <tr key={t.id} className={`hover:bg-gray-50 ${t.is_closed ? 'opacity-70' : ''}`}>
                  <td className="table-td">{formatDate(t.tx_date)}</td>
                  <td className="table-td"><TxTypeBadge type={t.tx_type} /></td>
                  <td className="table-td">{t.category}</td>
                  <td className={`table-td text-right font-semibold ${t.tx_type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                    {t.tx_type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </td>
                  <td className="table-td text-gray-500">{t.note ?? '—'}</td>
                  <td className="table-td">
                    {t.is_closed
                      ? <span className="text-xs text-gray-500 flex items-center gap-1">🔒 ปิดยอดแล้ว</span>
                      : <span className="text-xs text-green-600">● เปิด</span>
                    }
                  </td>
                  <td className="table-td">
                    {!t.is_closed && (
                      <button
                        onClick={() => handleDelete(t.id, t.tx_date)}
                        disabled={deletingId === t.id}
                        className="text-red-400 hover:text-red-600 text-xs disabled:opacity-50"
                      >
                        ลบ
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
