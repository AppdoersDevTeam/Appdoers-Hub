'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Feature, PermissionLevel } from '@/lib/permissions'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

/** Directors only — update a team member's custom permission overrides */
export async function updateTeamPermissionsAction(
  targetUserId: string,
  permissions: Partial<Record<Feature, PermissionLevel>>
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createClient()

    // Verify caller is a director
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const { data: caller } = await supabase
      .from('team_users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (caller?.role !== 'director') {
      return { success: false, error: 'Director access required' }
    }

    const { error } = await supabase
      .from('team_users')
      .update({ permissions })
      .eq('id', targetUserId)

    if (error) return { success: false, error: error.message }
    revalidatePath('/app/settings')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
