'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

export async function updateRoom(id, data) {
  const supabase = await createClient()
  const { error } = await supabase.from('rooms').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/rooms')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function saveMeterReading(data) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('meter_readings')
    .upsert(data, { onConflict: 'room_id,billing_month' })
  if (error) return { error: error.message }
  revalidatePath(`/rooms/${data.room_id}/meter`)
  return { success: true }
}
