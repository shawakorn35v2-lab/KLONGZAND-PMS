'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addStockMovement, createInventoryRequest, updateRequestStatus, createInventoryItem, seedCommonAreaItems } from '@/app/actions/inventory'
import { formatDateTime } from '@/lib/dateUtils'

function formatNum(n) {
  return Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const STATUS_LABELS = { pending: 'รอดำเนินการ', approved: 'อนุมัติแล้ว', fulfilled: 'จัดส่งแล้ว', rejected: 'ปฏิเสธ' }
const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  fulfilled: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const TABS = [
  { id: 'stock', label: 'สต๊อก' },
  { id: 'move', label: 'รับ/เบิก' },
  { id: 'requests', label: 'คำขอ' },
  { id: 'history', label: 'ประวัติ' },
]

export default function InventoryClient({ items, movements, requests, rooms, role }) {
  const router = useRouter()
  const isAdmin = role === 'admin'
  const [tab, setTab] = useState('stock')

  // New item form
  const [showItemForm, setShowItemForm] = useState(false)
  const [itemForm, setItemForm] = useState({ name: '', unit: 'ชิ้น', reorder_point: '' })
  const [itemLoading, setItemLoading] = useState(false)
  const [itemError, setItemError] = useState('')
  const [seeding, setSeeding] = useState(false)

  // Stock-in form
  const [inForm, setInForm] = useState({ item_id: '', quantity: '', unit_cost: '', note: '' })
  const [inLoading, setInLoading] = useState(false)
  const [inError, setInError] = useState('')

  // Stock-out form
  const [outForm, setOutForm] = useState({ item_id: '', quantity: '', room_id: '', note: '' })
  const [outLoading, setOutLoading] = useState(false)
  const [outError, setOutError] = useState('')

  // Request form
  const [reqForm, setReqForm] = useState({ item_id: '', requested_qty: '', note: '' })
  const [reqLoading, setReqLoading] = useState(false)
  const [reqError, setReqError] = useState('')

  // History filters
  const [histFilter, setHistFilter] = useState({ item_id: '', type: '' })

  const lowStockItems = items.filter(i => Number(i.current_stock) < Number(i.reorder_point))
  const pendingCount = requests.filter(r => r.status === 'pending').length

  // Real-time stock-out validation
  const selectedOutItem = items.find(i => i.id === outForm.item_id)
  const outOverStock = selectedOutItem && Number(outForm.quantity) > 0 && Number(outForm.quantity) > Number(selectedOutItem.current_stock)

  async function handleCreateItem(e) {
    e.preventDefault()
    setItemError('')
    if (!itemForm.name.trim()) { setItemError('กรุณากรอกชื่อรายการ'); return }
    setItemLoading(true)
    const result = await createInventoryItem({ name: itemForm.name, unit: itemForm.unit, reorder_point: itemForm.reorder_point })
    setItemLoading(false)
    if (result.error) { setItemError(result.error); return }
    setItemForm({ name: '', unit: 'ชิ้น', reorder_point: '' })
    setShowItemForm(false)
    router.refresh()
  }

  async function handleStockIn(e) {
    e.preventDefault()
    setInError('')
    if (!inForm.item_id) { setInError('กรุณาเลือกรายการของใช้'); return }
    if (!inForm.quantity || Number(inForm.quantity) <= 0) { setInError('กรุณากรอกจำนวน'); return }
    setInLoading(true)
    const result = await addStockMovement({
      item_id: inForm.item_id,
      movement_type: 'stock_in',
      quantity: inForm.quantity,
      room_id: null,
      unit_cost: inForm.unit_cost || null,
      note: inForm.note || null,
    })
    setInLoading(false)
    if (result.error) { setInError(result.error); return }
    setInForm({ item_id: '', quantity: '', unit_cost: '', note: '' })
    router.refresh()
  }

  async function handleStockOut(e) {
    e.preventDefault()
    setOutError('')
    if (!outForm.item_id) { setOutError('กรุณาเลือกรายการของใช้'); return }
    if (!outForm.quantity || Number(outForm.quantity) <= 0) { setOutError('กรุณากรอกจำนวน'); return }
    if (outOverStock) { setOutError(`สต๊อกไม่พอ — มีอยู่ ${formatNum(selectedOutItem.current_stock)} ${selectedOutItem.unit}`); return }
    setOutLoading(true)
    const result = await addStockMovement({
      item_id: outForm.item_id,
      movement_type: 'stock_out',
      quantity: outForm.quantity,
      room_id: outForm.room_id || null,
      unit_cost: null,
      note: outForm.note || null,
    })
    setOutLoading(false)
    if (result.error) { setOutError(result.error); return }
    setOutForm({ item_id: '', quantity: '', room_id: '', note: '' })
    router.refresh()
  }

  async function handleRequest(e) {
    e.preventDefault()
    setReqError('')
    if (!reqForm.item_id) { setReqError('กรุณาเลือกรายการ'); return }
    if (!reqForm.requested_qty || Number(reqForm.requested_qty) <= 0) { setReqError('กรุณากรอกจำนวน'); return }
    setReqLoading(true)
    const result = await createInventoryRequest({ item_id: reqForm.item_id, requested_qty: reqForm.requested_qty, note: reqForm.note })
    setReqLoading(false)
    if (result.error) { setReqError(result.error); return }
    setReqForm({ item_id: '', requested_qty: '', note: '' })
    router.refresh()
  }

  async function handleReqStatus(id, status) {
    const result = await updateRequestStatus(id, status)
    if (result.error) alert(result.error)
    else router.refresh()
  }

  const filteredMovements = movements.filter(m => {
    if (histFilter.item_id && m.item_id !== histFilter.item_id) return false
    if (histFilter.type && m.movement_type !== histFilter.type) return false
    return true
  })

  return (
    <div className="space-y-4">
      {/* Low stock alert banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex flex-wrap gap-2 items-center">
          <span className="text-red-700 text-sm font-semibold">⚠️ สต๊อกใกล้หมด:</span>
          {lowStockItems.map(i => (
            <span key={i.id} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
              {i.name} ({formatNum(i.current_stock)} {i.unit})
            </span>
          ))}
        </div>
      )}

      {/* Quick action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setTab('move')}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          📦 รับของเข้า
        </button>
        <button
          onClick={() => setTab('move')}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
        >
          📤 เบิกของ
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.id === 'requests' && pendingCount > 0 && (
              <span className="ml-1.5 bg-yellow-400 text-yellow-900 text-xs rounded-full px-1.5 py-0.5 font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: สต๊อก ── */}
      {tab === 'stock' && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={async () => {
                  setSeeding(true)
                  const r = await seedCommonAreaItems()
                  setSeeding(false)
                  if (r.error) alert(r.error)
                  else router.refresh()
                }}
                disabled={seeding}
                className="btn-secondary text-sm"
              >
                {seeding ? 'กำลังเพิ่ม...' : '🧹 นำเข้ารายการพื้นที่ส่วนกลาง'}
              </button>
              <button onClick={() => setShowItemForm(!showItemForm)} className="btn-primary">
                {showItemForm ? '✕ ปิด' : '+ เพิ่มรายการใหม่'}
              </button>
            </div>
          )}

          {showItemForm && isAdmin && (
            <div className="card max-w-md">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">เพิ่มรายการของใช้ใหม่</h3>
              <form onSubmit={handleCreateItem} className="space-y-3">
                <div>
                  <label className="label">ชื่อรายการ *</label>
                  <input type="text" required value={itemForm.name}
                    onChange={e => setItemForm(p => ({ ...p, name: e.target.value }))}
                    className="input" placeholder="เช่น สบู่เหลว" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">หน่วย *</label>
                    <input type="text" required value={itemForm.unit}
                      onChange={e => setItemForm(p => ({ ...p, unit: e.target.value }))}
                      className="input" placeholder="ชิ้น / ขวด / ม้วน" />
                  </div>
                  <div>
                    <label className="label">จุดเตือนสต๊อก</label>
                    <input type="number" min="0" value={itemForm.reorder_point}
                      onChange={e => setItemForm(p => ({ ...p, reorder_point: e.target.value }))}
                      className="input" placeholder="0" />
                  </div>
                </div>
                {itemError && <p className="text-sm text-red-600">{itemError}</p>}
                <div className="flex gap-3">
                  <button type="submit" disabled={itemLoading} className="btn-primary">
                    {itemLoading ? 'กำลังบันทึก...' : 'บันทึก'}
                  </button>
                  <button type="button" onClick={() => setShowItemForm(false)} className="btn-secondary">ยกเลิก</button>
                </div>
              </form>
            </div>
          )}

          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="table-th">รายการของใช้</th>
                    <th className="table-th">หน่วย</th>
                    <th className="table-th text-right">สต๊อกปัจจุบัน</th>
                    <th className="table-th text-right">จุดเตือน</th>
                    <th className="table-th">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.length === 0 && (
                    <tr><td colSpan={5} className="text-center text-gray-400 py-8">ไม่มีรายการ</td></tr>
                  )}
                  {items.map(item => {
                    const isLow = Number(item.current_stock) < Number(item.reorder_point)
                    return (
                      <tr key={item.id} className={`hover:bg-gray-50 ${isLow ? 'bg-red-50' : ''}`}>
                        <td className={`table-td font-medium ${isLow ? 'text-red-700' : ''}`}>{item.name}</td>
                        <td className="table-td text-gray-500">{item.unit}</td>
                        <td className={`table-td text-right font-bold text-lg ${isLow ? 'text-red-700' : 'text-gray-900'}`}>
                          {formatNum(item.current_stock)}
                        </td>
                        <td className="table-td text-right text-gray-500">{formatNum(item.reorder_point)}</td>
                        <td className="table-td">
                          {isLow
                            ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">⚠ ใกล้หมด</span>
                            : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ ปกติ</span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: รับ/เบิก ── */}
      {tab === 'move' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Stock-in card */}
          <div className="card border-l-4 border-green-500">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              📦 รับของเข้าสต๊อก
            </h3>
            <form onSubmit={handleStockIn} className="space-y-3">
              <div>
                <label className="label">รายการของใช้ *</label>
                <select required value={inForm.item_id}
                  onChange={e => setInForm(p => ({ ...p, item_id: e.target.value }))} className="input">
                  <option value="">-- เลือกรายการ --</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name} (คงเหลือ {formatNum(i.current_stock)} {i.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">จำนวน *</label>
                  <input type="number" required min="0.01" step="0.01"
                    value={inForm.quantity}
                    onChange={e => setInForm(p => ({ ...p, quantity: e.target.value }))}
                    className="input" placeholder="0" />
                </div>
                <div>
                  <label className="label">ราคา/หน่วย (บาท)</label>
                  <input type="number" min="0" step="0.01"
                    value={inForm.unit_cost}
                    onChange={e => setInForm(p => ({ ...p, unit_cost: e.target.value }))}
                    className="input" placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="label">หมายเหตุ</label>
                <input type="text" value={inForm.note}
                  onChange={e => setInForm(p => ({ ...p, note: e.target.value }))}
                  className="input" placeholder="รายละเอียดเพิ่มเติม" />
              </div>
              {inError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{inError}</p>}
              <button type="submit" disabled={inLoading}
                className="w-full py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
                {inLoading ? 'กำลังบันทึก...' : '📦 บันทึกรับเข้าสต๊อก'}
              </button>
            </form>
          </div>

          {/* Stock-out card */}
          <div className="card border-l-4 border-orange-500">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              📤 เบิกของออก
            </h3>
            <form onSubmit={handleStockOut} className="space-y-3">
              <div>
                <label className="label">รายการของใช้ *</label>
                <select required value={outForm.item_id}
                  onChange={e => setOutForm(p => ({ ...p, item_id: e.target.value, quantity: '' }))} className="input">
                  <option value="">-- เลือกรายการ --</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name} (คงเหลือ {formatNum(i.current_stock)} {i.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">จำนวน *</label>
                <input type="number" required min="0.01" step="0.01"
                  value={outForm.quantity}
                  onChange={e => setOutForm(p => ({ ...p, quantity: e.target.value }))}
                  className={`input ${outOverStock ? 'border-red-400 bg-red-50' : ''}`}
                  placeholder="0" />
                {outOverStock && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠ เกินสต๊อก — มีอยู่ {formatNum(selectedOutItem.current_stock)} {selectedOutItem.unit}
                  </p>
                )}
              </div>
              <div>
                <label className="label">เบิกไปใช้ห้อง (ถ้ามี)</label>
                <select value={outForm.room_id}
                  onChange={e => setOutForm(p => ({ ...p, room_id: e.target.value }))} className="input">
                  <option value="">-- ใช้ทั่วไป ไม่เจาะห้อง --</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>ห้อง {r.room_no} (อาคาร {r.building})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">หมายเหตุ</label>
                <input type="text" value={outForm.note}
                  onChange={e => setOutForm(p => ({ ...p, note: e.target.value }))}
                  className="input" placeholder="รายละเอียดเพิ่มเติม" />
              </div>
              {outError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{outError}</p>}
              <button type="submit" disabled={outLoading || outOverStock}
                className="w-full py-2.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors">
                {outLoading ? 'กำลังบันทึก...' : '📤 บันทึกเบิกออก'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── TAB: คำขอ ── */}
      {tab === 'requests' && (
        <div className="space-y-4">
          <div className="card max-w-md">
            <h3 className="text-base font-semibold text-gray-900 mb-4">ขอเบิกของใช้เพิ่มเติม</h3>
            <form onSubmit={handleRequest} className="space-y-3">
              <div>
                <label className="label">รายการของใช้ *</label>
                <select required value={reqForm.item_id}
                  onChange={e => setReqForm(p => ({ ...p, item_id: e.target.value }))} className="input">
                  <option value="">-- เลือกรายการ --</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name} (คงเหลือ {formatNum(i.current_stock)} {i.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">จำนวนที่ขอ *</label>
                <input type="number" required min="1" step="1"
                  value={reqForm.requested_qty}
                  onChange={e => setReqForm(p => ({ ...p, requested_qty: e.target.value }))}
                  className="input" placeholder="0" />
              </div>
              <div>
                <label className="label">หมายเหตุ</label>
                <input type="text" value={reqForm.note}
                  onChange={e => setReqForm(p => ({ ...p, note: e.target.value }))}
                  className="input" placeholder="เหตุผล / รายละเอียด" />
              </div>
              {reqError && <p className="text-sm text-red-600">{reqError}</p>}
              <button type="submit" disabled={reqLoading} className="btn-primary w-full justify-center">
                {reqLoading ? 'กำลังส่งคำขอ...' : 'ส่งคำขอ'}
              </button>
            </form>
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">รายการคำขอทั้งหมด</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="table-th">รายการ</th>
                    <th className="table-th text-right">จำนวน</th>
                    <th className="table-th">ผู้ขอ</th>
                    <th className="table-th">หมายเหตุ</th>
                    <th className="table-th">วันที่</th>
                    <th className="table-th">สถานะ</th>
                    {isAdmin && <th className="table-th">จัดการ</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requests.length === 0 && (
                    <tr><td colSpan={isAdmin ? 7 : 6} className="text-center text-gray-400 py-8">ไม่มีคำขอ</td></tr>
                  )}
                  {requests.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="table-td font-medium">{r.item?.name ?? '—'}</td>
                      <td className="table-td text-right">{formatNum(r.requested_qty)} {r.item?.unit}</td>
                      <td className="table-td text-gray-500">{r.requester?.full_name ?? '—'}</td>
                      <td className="table-td text-gray-500">{r.note ?? '—'}</td>
                      <td className="table-td text-gray-500 whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                      <td className="table-td">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] ?? ''}`}>
                          {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="table-td">
                          {r.status === 'pending' && (
                            <div className="flex gap-1.5 flex-wrap">
                              <button onClick={() => handleReqStatus(r.id, 'approved')}
                                className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">อนุมัติ</button>
                              <button onClick={() => handleReqStatus(r.id, 'rejected')}
                                className="px-2.5 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-red-100 hover:text-red-700">ปฏิเสธ</button>
                            </div>
                          )}
                          {r.status === 'approved' && (
                            <button onClick={() => handleReqStatus(r.id, 'fulfilled')}
                              className="px-2.5 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">จัดส่งแล้ว</button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: ประวัติ ── */}
      {tab === 'history' && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex flex-wrap gap-3 items-center">
              <span className="text-sm font-medium text-gray-700">กรอง:</span>
              <select value={histFilter.item_id}
                onChange={e => setHistFilter(p => ({ ...p, item_id: e.target.value }))}
                className="input sm:max-w-[180px]">
                <option value="">ทุกรายการ</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
              <select value={histFilter.type}
                onChange={e => setHistFilter(p => ({ ...p, type: e.target.value }))}
                className="input sm:max-w-[160px]">
                <option value="">ทุกประเภท</option>
                <option value="stock_in">รับเข้า</option>
                <option value="stock_out">เบิกออก</option>
              </select>
              <button onClick={() => setHistFilter({ item_id: '', type: '' })} className="text-sm text-gray-500 hover:text-gray-700">
                รีเซ็ต
              </button>
              <span className="text-xs text-gray-400 ml-auto">{filteredMovements.length} รายการ</span>
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="table-th whitespace-nowrap">วันที่</th>
                    <th className="table-th">ประเภท</th>
                    <th className="table-th">รายการ</th>
                    <th className="table-th text-right">จำนวน</th>
                    <th className="table-th">ห้อง</th>
                    <th className="table-th text-right">ราคา/หน่วย</th>
                    <th className="table-th">หมายเหตุ</th>
                    <th className="table-th">บันทึกโดย</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMovements.length === 0 && (
                    <tr><td colSpan={8} className="text-center text-gray-400 py-8">ไม่มีรายการ</td></tr>
                  )}
                  {filteredMovements.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="table-td text-gray-500 whitespace-nowrap">{formatDateTime(m.created_at)}</td>
                      <td className="table-td whitespace-nowrap">
                        {m.movement_type === 'stock_in'
                          ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">📦 รับเข้า</span>
                          : <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">📤 เบิกออก</span>
                        }
                      </td>
                      <td className="table-td font-medium">{m.item?.name ?? '—'}</td>
                      <td className={`table-td text-right font-semibold whitespace-nowrap ${m.movement_type === 'stock_in' ? 'text-green-700' : 'text-orange-700'}`}>
                        {m.movement_type === 'stock_in' ? '+' : '-'}{formatNum(m.quantity)} {m.item?.unit}
                      </td>
                      <td className="table-td text-gray-500">{m.room?.room_no ? `ห้อง ${m.room.room_no}` : '—'}</td>
                      <td className="table-td text-right text-gray-500">{m.unit_cost ? `฿${formatNum(m.unit_cost)}` : '—'}</td>
                      <td className="table-td text-gray-500">{m.note ?? '—'}</td>
                      <td className="table-td text-gray-500">{m.creator?.full_name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
