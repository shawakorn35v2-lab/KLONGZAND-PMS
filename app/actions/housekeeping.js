'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

export async function updateHousekeepingStatus(roomId, status, note) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }

  const { error: roomErr } = await supabase
    .from('rooms')
    .update({ housekeeping_status: status })
    .eq('id', roomId)
  if (roomErr) return { error: roomErr.message }

  await supabase.from('housekeeping_log').insert({
    room_id: roomId,
    status,
    note: note || null,
    updated_by: user.id,
  })

  revalidatePath('/housekeeping')
  revalidatePath('/rooms')
  revalidatePath('/dashboard')
  return { success: true }
}
