'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { getTodayString } from '@/lib/dateUtils'

export async function createSaleItem({ name, unit, sale_price }) {
  const supabase = await createClient()
  const trimmedName = name.trim()

  // Check for existing item with same name (case-insensitive)
  const { data: existing } = await supabase
    .from('inventory_items')
    .select('id, name, is_for_sale, current_stock, unit')
    .ilike('name', trimmedName)
    .maybeSingle()

  if (existing) {
    if (existing.is_for_sale) {
      return { error: 'สินค้านี้เป็นสินค้าขายอยู่แล้ว' }
    }
    // Exists but not yet a sale item — ask user to confirm conversion
    return { existingItem: existing }
  }

  const { data, error } = await supabase
    .from('inventory_items')
    .insert({ name: trimmedName, unit, reorder_point: 0, is_for_sale: true, sale_price: Number(sale_price) })
    .select()
    .single()
  if (error) return { error: error.message }
  revalidatePath('/inventory')
  return { data }
}

export async function convertToSaleItem(id, sale_price) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('inventory_items')
    .update({ is_for_sale: true, sale_price: Number(sale_price) })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/inventory')
  return {}
}

export async function createInventoryItem({ name, unit, reorder_point }) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inventory_items')
    .insert({ name, unit, reorder_point: Number(reorder_point) || 0 })
    .select()
    .single()
  if (error) return { error: error.message }
  revalidatePath('/inventory')
  return { data }
}

export async function updateInventoryItem(id, fields) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'เฉพาะแอดมินเท่านั้น' }

  const patch = {}
  if ('is_for_sale' in fields) {
    patch.is_for_sale = Boolean(fields.is_for_sale)
    patch.sale_price = fields.is_for_sale ? (Number(fields.sale_price) || null) : null
  }
  if ('name' in fields) {
    const name = String(fields.name || '').trim()
    if (!name) return { error: 'กรุณากรอกชื่อรายการ' }
    patch.name = name
  }
  if ('unit' in fields) {
    const unit = String(fields.unit || '').trim()
    if (!unit) return { error: 'กรุณากรอกหน่วย' }
    patch.unit = unit
  }
  if ('reorder_point' in fields) {
    patch.reorder_point = Number(fields.reorder_point) || 0
  }

  if (Object.keys(patch).length === 0) return {}

  const { error } = await supabase.from('inventory_items').update(patch).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/inventory')
  return {}
}

export async function adjustStock({ item_id, new_stock, note }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'เฉพาะแอดมินเท่านั้น' }

  const target = Number(new_stock)
  if (!Number.isFinite(target) || target < 0) return { error: 'จำนวนไม่ถูกต้อง' }

  const { data: item, error: itemErr } = await supabase
    .from('inventory_items').select('name, unit, current_stock').eq('id', item_id).single()
  if (itemErr || !item) return { error: 'ไม่พบรายการ' }

  const current = Number(item.current_stock)
  const delta = Number((target - current).toFixed(2))
  if (delta === 0) return {}

  const reason = (note || '').trim()
  const movementNote = reason
    ? `ปรับสต๊อก: ${reason}`
    : `ปรับสต๊อก (${formatQty(current)} → ${formatQty(target)} ${item.unit})`

  const { error } = await supabase.from('inventory_movements').insert({
    item_id,
    movement_type: delta > 0 ? 'stock_in' : 'stock_out',
    quantity: Math.abs(delta),
    note: movementNote,
    created_by: user.id,
  })
  if (error) return { error: error.message }
  revalidatePath('/inventory')
  return {}
}

function formatQty(n) {
  return Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export async function addStockMovement({ item_id, movement_type, quantity, room_id, unit_cost, note }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }

  if (movement_type === 'stock_out') {
    const { data: item } = await supabase
      .from('inventory_items').select('current_stock, unit').eq('id', item_id).single()
    if (item && Number(quantity) > Number(item.current_stock)) {
      return { error: `สต๊อกไม่พอ — มีอยู่ ${Number(item.current_stock).toLocaleString('th-TH')} ${item.unit}` }
    }
  }

  const { error } = await supabase.from('inventory_movements').insert({
    item_id,
    movement_type,
    quantity: Number(quantity),
    room_id: room_id || null,
    unit_cost: unit_cost ? Number(unit_cost) : null,
    note: note || null,
    created_by: user?.id ?? null,
  })
  if (error) return { error: error.message }
  revalidatePath('/inventory')
  return {}
}

export async function sellItem({ item_id, quantity, note }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }

  const { data: item, error: itemErr } = await supabase
    .from('inventory_items')
    .select('name, unit, current_stock, sale_price, is_for_sale')
    .eq('id', item_id)
    .single()
  if (itemErr || !item) return { error: 'ไม่พบรายการสินค้า' }
  if (!item.is_for_sale) return { error: 'รายการนี้ไม่ได้ตั้งเป็นสินค้าขาย' }
  if (Number(quantity) > Number(item.current_stock)) {
    return { error: `สต๊อกไม่พอ — มีอยู่ ${Number(item.current_stock).toLocaleString('th-TH')} ${item.unit}` }
  }

  const qty = Number(quantity)
  const amount = Number(item.sale_price || 0) * qty
  const txNote = note || `ขาย ${item.name} x${qty} ${item.unit}`

  // Insert transaction first
  const { data: tx, error: txErr } = await supabase.from('transactions').insert({
    tx_date: getTodayString(),
    tx_type: 'income',
    category: 'ขายของ',
    amount,
    note: txNote,
    created_by: user.id,
  }).select('id').single()
  if (txErr) return { error: txErr.message }

  // Insert movement linked to transaction
  const { error: mvErr } = await supabase.from('inventory_movements').insert({
    item_id,
    movement_type: 'sale',
    quantity: qty,
    note: txNote,
    transaction_id: tx.id,
    created_by: user.id,
  })
  if (mvErr) {
    // Rollback: remove the transaction we just created
    await supabase.from('transactions').delete().eq('id', tx.id)
    return { error: mvErr.message }
  }

  revalidatePath('/inventory')
  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return {}
}

export async function createInventoryRequest({ item_id, requested_qty, note }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('inventory_requests').insert({
    item_id,
    requested_qty: Number(requested_qty),
    note: note || null,
    requested_by: user?.id ?? null,
  })
  if (error) return { error: error.message }
  revalidatePath('/inventory')
  return {}
}

export async function seedCommonAreaItems() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }

  const items = [
    { name: 'ผงซักฟอก', unit: 'ถุง', reorder_point: 5 },
    { name: 'ไฮเตอร์', unit: 'ขวด', reorder_point: 3 },
    { name: 'น้ำยาปรับผ้านุ่ม', unit: 'ขวด', reorder_point: 3 },
    { name: 'น้ำยาทำความสะอาด', unit: 'ขวด', reorder_point: 5 },
    { name: 'ไม้กวาด', unit: 'ด้าม', reorder_point: 2 },
    { name: 'ผ้าถูพื้น', unit: 'ผืน', reorder_point: 3 },
    { name: 'ถุงขยะ', unit: 'ม้วน', reorder_point: 5 },
  ]

  const { error } = await supabase
    .from('inventory_items')
    .upsert(items, { onConflict: 'name', ignoreDuplicates: true })

  if (error) return { error: error.message }
  revalidatePath('/inventory')
  return { success: true, count: items.length }
}

export async function updateRequestStatus(id, status) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('inventory_requests').update({
    status,
    resolved_by: user?.id ?? null,
    resolved_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/inventory')
  return {}
}
