'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

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

export async function addStockMovement({ item_id, movement_type, quantity, room_id, unit_cost, note }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
