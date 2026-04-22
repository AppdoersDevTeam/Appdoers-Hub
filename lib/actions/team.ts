'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

// ─── Update Own Profile ───────────────────────────────────────────────────────

export async function updateProfileAction(data: {
  full_name: string
  phone?: string
  title?: string
  avatar_url?: string
}): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const { error } = await supabase
      .from('team_users')
      .update({
        full_name: data.full_name,
        ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
        ...(data.title !== undefined ? { title: data.title || null } : {}),
        ...(data.avatar_url !== undefined ? { avatar_url: data.avatar_url || null } : {}),
      })
      .eq('id', user.id)

    if (error) return { success: false, error: error.message }
    revalidatePath('/app/account')
    revalidatePath('/app/settings')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Change Own Password ──────────────────────────────────────────────────────

export async function changePasswordAction(
  newPassword: string
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Create Team Member (Director only) ──────────────────────────────────────

export async function createTeamMemberAction(data: {
  email: string
  full_name: string
  role: string
  phone?: string
  title?: string
  password: string
}): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { data: caller } = await supabase
      .from('team_users')
      .select('role')
      .eq('id', user?.id ?? '')
      .single()
    if (caller?.role !== 'director') {
      return { success: false, error: 'Only directors can create team members' }
    }

    const serviceClient = await createServiceClient()
    const { data: newUser, error: authError } =
      await serviceClient.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.full_name },
      })

    if (authError || !newUser?.user) {
      return {
        success: false,
        error: authError?.message ?? 'Failed to create user',
      }
    }

    const { error: dbError } = await supabase.from('team_users').insert({
      id: newUser.user.id,
      email: data.email,
      full_name: data.full_name,
      role: data.role,
      phone: data.phone ?? null,
      title: data.title ?? null,
      is_active: true,
    })

    if (dbError) {
      // Attempt to clean up auth user if DB insert fails
      await serviceClient.auth.admin.deleteUser(newUser.user.id)
      return { success: false, error: dbError.message }
    }

    revalidatePath('/app/settings')
    return { success: true, data: { id: newUser.user.id } }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Update Team Member (Director only) ──────────────────────────────────────

export async function updateTeamMemberAction(
  id: string,
  data: {
    full_name: string
    role: string
    phone?: string
    title?: string
  }
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { data: caller } = await supabase
      .from('team_users')
      .select('role')
      .eq('id', user?.id ?? '')
      .single()
    if (caller?.role !== 'director') {
      return { success: false, error: 'Only directors can edit team members' }
    }

    const { error } = await supabase
      .from('team_users')
      .update({
        full_name: data.full_name,
        role: data.role,
        phone: data.phone ?? null,
        title: data.title ?? null,
      })
      .eq('id', id)

    if (error) return { success: false, error: error.message }
    revalidatePath('/app/settings')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Toggle Active Status (Director only) ────────────────────────────────────

export async function toggleTeamMemberActiveAction(
  id: string,
  is_active: boolean
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (id === user?.id) {
      return { success: false, error: 'You cannot deactivate your own account' }
    }
    const { data: caller } = await supabase
      .from('team_users')
      .select('role')
      .eq('id', user?.id ?? '')
      .single()
    if (caller?.role !== 'director') {
      return { success: false, error: 'Only directors can manage team members' }
    }

    const { error } = await supabase
      .from('team_users')
      .update({ is_active })
      .eq('id', id)

    if (error) return { success: false, error: error.message }
    revalidatePath('/app/settings')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─── Reset Password for Member (Director only) ────────────────────────────────

export async function resetMemberPasswordAction(
  id: string,
  newPassword: string
): Promise<ActionResult<undefined>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { data: caller } = await supabase
      .from('team_users')
      .select('role')
      .eq('id', user?.id ?? '')
      .single()
    if (caller?.role !== 'director') {
      return { success: false, error: 'Only directors can reset passwords' }
    }

    const serviceClient = await createServiceClient()
    const { error } = await serviceClient.auth.admin.updateUserById(id, {
      password: newPassword,
    })

    if (error) return { success: false, error: error.message }
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
