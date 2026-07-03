'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

function bangkokDateStr() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${p.year}${p.month}${p.day}`
}

function bangkokIsoDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${p.year}-${p.month}-${p.day}`
}

function roundMoney(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}

function sanitizeItems(items) {
  const clean = (items ?? [])
    .map((it, i) => ({
      sort_order: i + 1,
      description: String(it.description || '').trim(),
      quantity: Number(it.quantity) || 0,
      unit_price: Number(it.unitPrice ?? it.unit_price) || 0,
    }))
    .filter(it => it.description || it.quantity > 0 || it.unit_price > 0)
    .map(it => ({ ...it, amount: roundMoney(it.quantity * it.unit_price) }))
  return clean
}

function itemsSignature(items) {
  return JSON.stringify(
    (items ?? []).map(it => [
      it.sort_order ?? 0,
      String(it.description ?? '').trim(),
      Number(it.quantity) || 0,
      Number(it.unit_price ?? it.unitPrice) || 0,
    ])
  )
}

const HEADER_FIELDS = [
  ['receipt_date', 'วันที่ในใบเสร็จ'],
  ['customer_name', 'ชื่อลูกค้า'],
  ['customer_address', 'ที่อยู่'],
  ['customer_tel', 'เบอร์โทร'],
  ['customer_tax_id', 'เลขผู้เสียภาษี'],
  ['payment_method', 'ช่องทางชำระ'],
  ['payment_other_note', 'ระบุช่องทางอื่น'],
  ['remark', 'หมายเหตุ'],
  ['discount', 'ส่วนลด'],
]

export async function getReceipts({ page = 1, limit = 20, search = '' } = {}) {
  const supabase = await createClient()
  const from = (page - 1) * limit
  const to = from + limit - 1

  let q = supabase
    .from('receipts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  const s = String(search || '').trim()
  if (s) {
    const escaped = s.replace(/[%_,]/g, m => `\\${m}`)
    q = q.or(`receipt_no.ilike.%${escaped}%,customer_name.ilike.%${escaped}%`)
  }

  const { data, count, error } = await q
  if (error) return { error: error.message, data: [], count: 0 }
  return { data: data ?? [], count: count ?? 0 }
}

export async function getReceipt(id) {
  const supabase = await createClient()
  const [
    { data: receipt, error: rErr },
    { data: items, error: iErr },
    { data: edits, error: eErr },
  ] = await Promise.all([
    supabase.from('receipts').select('*').eq('id', id).maybeSingle(),
    supabase.from('receipt_items').select('*').eq('receipt_id', id).order('sort_order'),
    supabase
      .from('receipt_edits')
      .select('id, edited_at, changed_fields, note, editor:profiles!edited_by(full_name)')
      .eq('receipt_id', id)
      .order('edited_at', { ascending: false }),
  ])
  if (rErr) return { error: rErr.message }
  if (iErr) return { error: iErr.message }
  if (eErr) return { error: eErr.message }
  if (!receipt) return { error: 'ไม่พบใบเสร็จ' }
  return { data: { ...receipt, items: items ?? [], edits: edits ?? [] } }
}

export async function createReceipt(payload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }

  const {
    customerName = '',
    customerAddress = '',
    customerTel = '',
    customerTaxId = '',
    paymentMethod = 'cash',
    paymentOtherNote = '',
    remark = '',
    items = [],
    discount = 0,
    receipt_date = null,
  } = payload ?? {}

  if (!['cash', 'transfer', 'other'].includes(paymentMethod)) {
    return { error: 'ช่องทางชำระไม่ถูกต้อง' }
  }

  const cleanItems = sanitizeItems(items)

  if (cleanItems.length === 0) return { error: 'กรุณากรอกอย่างน้อย 1 รายการ' }
  if (cleanItems.length > 10) return { error: 'รายการเกิน 10 แถว' }

  const subtotal = roundMoney(cleanItems.reduce((s, it) => s + it.amount, 0))
  const disc = Math.max(0, roundMoney(Number(discount) || 0))
  const total = Math.max(0, roundMoney(subtotal - disc))
  const finalReceiptDate = receipt_date || bangkokIsoDate()

  // Generate receipt_no with retry on unique-violation race
  const dateStr = bangkokDateStr()
  const { count } = await supabase
    .from('receipts')
    .select('*', { count: 'exact', head: true })
    .like('receipt_no', `RC-${dateStr}-%`)

  let attempt = count ?? 0
  let insertedReceipt = null
  let lastError = null
  for (let i = 0; i < 5; i++) {
    attempt += 1
    const receiptNo = `RC-${dateStr}-${String(attempt).padStart(3, '0')}`
    const { data, error } = await supabase
      .from('receipts')
      .insert({
        receipt_no: receiptNo,
        receipt_date: finalReceiptDate,
        customer_name: customerName,
        customer_address: customerAddress,
        customer_tel: customerTel,
        customer_tax_id: customerTaxId,
        payment_method: paymentMethod,
        payment_other_note: paymentOtherNote,
        remark,
        subtotal,
        discount: disc,
        total_amount: total,
        created_by: user.id,
      })
      .select('id, receipt_no')
      .single()
    if (!error) { insertedReceipt = data; break }
    lastError = error
    if (error.code !== '23505') return { error: error.message }
  }
  if (!insertedReceipt) return { error: 'สร้างเลขใบเสร็จซ้ำหลายครั้ง กรุณาลองใหม่: ' + (lastError?.message ?? '') }

  const { error: itemsErr } = await supabase
    .from('receipt_items')
    .insert(cleanItems.map(it => ({ ...it, receipt_id: insertedReceipt.id })))
  if (itemsErr) {
    await supabase.from('receipts').delete().eq('id', insertedReceipt.id)
    return { error: itemsErr.message }
  }

  revalidatePath('/receipts')
  return { success: true, id: insertedReceipt.id, receipt_no: insertedReceipt.receipt_no }
}

export async function updateReceipt(id, payload, note = '') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }

  const {
    customerName = '',
    customerAddress = '',
    customerTel = '',
    customerTaxId = '',
    paymentMethod = 'cash',
    paymentOtherNote = '',
    remark = '',
    items = [],
    discount = 0,
    receipt_date = null,
  } = payload ?? {}

  if (!['cash', 'transfer', 'other'].includes(paymentMethod)) {
    return { error: 'ช่องทางชำระไม่ถูกต้อง' }
  }

  const [{ data: current, error: curErr }, { data: currentItems, error: curItemsErr }] = await Promise.all([
    supabase.from('receipts').select('*').eq('id', id).maybeSingle(),
    supabase.from('receipt_items').select('sort_order, description, quantity, unit_price, amount').eq('receipt_id', id).order('sort_order'),
  ])
  if (curErr) return { error: curErr.message }
  if (curItemsErr) return { error: curItemsErr.message }
  if (!current) return { error: 'ไม่พบใบเสร็จ' }

  const cleanItems = sanitizeItems(items)
  if (cleanItems.length === 0) return { error: 'กรุณากรอกอย่างน้อย 1 รายการ' }
  if (cleanItems.length > 10) return { error: 'รายการเกิน 10 แถว' }

  const subtotal = roundMoney(cleanItems.reduce((s, it) => s + it.amount, 0))
  const disc = Math.max(0, roundMoney(Number(discount) || 0))
  const total = Math.max(0, roundMoney(subtotal - disc))

  const nextHeader = {
    receipt_date: receipt_date || current.receipt_date || bangkokIsoDate(),
    customer_name: customerName,
    customer_address: customerAddress,
    customer_tel: customerTel,
    customer_tax_id: customerTaxId,
    payment_method: paymentMethod,
    payment_other_note: paymentOtherNote,
    remark,
    discount: disc,
  }

  // Build diff
  const changed = []
  const changes = {}
  for (const [key, label] of HEADER_FIELDS) {
    const before = current[key] ?? ''
    const after = nextHeader[key] ?? ''
    const same = key === 'discount'
      ? Number(before) === Number(after)
      : String(before) === String(after)
    if (!same) {
      changed.push(label)
      changes[key] = { before, after }
    }
  }
  const beforeItemsSig = itemsSignature(currentItems ?? [])
  const afterItemsSig = itemsSignature(cleanItems)
  if (beforeItemsSig !== afterItemsSig) {
    changed.push('รายการ')
    changes.items = { before: currentItems ?? [], after: cleanItems }
  }
  const beforeTotal = Number(current.total_amount) || 0
  if (Number(total) !== beforeTotal && !changed.includes('ยอดรวม')) {
    changes.total_amount = { before: beforeTotal, after: total }
  }

  if (changed.length === 0 && !String(note || '').trim()) {
    return { success: true, id, noop: true }
  }

  const { error: updErr } = await supabase
    .from('receipts')
    .update({
      ...nextHeader,
      subtotal,
      total_amount: total,
    })
    .eq('id', id)
  if (updErr) return { error: updErr.message }

  const { error: delErr } = await supabase.from('receipt_items').delete().eq('receipt_id', id)
  if (delErr) return { error: delErr.message }

  const { error: insItemsErr } = await supabase
    .from('receipt_items')
    .insert(cleanItems.map(it => ({ ...it, receipt_id: id })))
  if (insItemsErr) return { error: insItemsErr.message }

  const { error: editErr } = await supabase.from('receipt_edits').insert({
    receipt_id: id,
    edited_by: user.id,
    changed_fields: changed,
    changes,
    note: String(note || '').trim(),
  })
  if (editErr) return { error: editErr.message }

  revalidatePath('/receipts')
  revalidatePath(`/receipts/${id}`)
  return { success: true, id }
}

export async function deleteReceipt(id) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'เฉพาะแอดมินเท่านั้น' }

  const { error } = await supabase.from('receipts').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/receipts')
  return { success: true }
}
