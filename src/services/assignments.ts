import { supabase } from './supabase'
import type {StaffAssignment} from '../types/database'

export const getAssignments = async (departmentId?: string): Promise<StaffAssignment[]> => {
    let query = supabase
        .from('staff_assignments')
        .select('*')
        .order('created_at')
    if (departmentId) {
        const { data: staff } = await supabase
            .from('staff')
            .select('id')
            .eq('department_id', departmentId)
        const staffIds = staff?.map(s => s.id) || []
        if (staffIds.length > 0) {
            query = query.in('staff_id', staffIds)
        }
    }
    const { data, error } = await query
    if (error) throw error
    return data || []
}

export const createAssignment = async (
    assignment: Omit<StaffAssignment, 'id' | 'created_at'>
): Promise<StaffAssignment> => {
    const { data, error } = await supabase
        .from('staff_assignments')
        .insert(assignment)
        .select()
        .single()
    if (error) throw error
    return data
}

export const updateAssignment = async (
    id: string,
    planned_hours: number,
    actual_hours: number
): Promise<void> => {
    const { error } = await supabase
        .from('staff_assignments')
        .update({ planned_hours, actual_hours })
        .eq('id', id)
    if (error) throw error
}

export const deleteAssignment = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('staff_assignments')
        .delete()
        .eq('id', id)
    if (error) throw error
}

export const getStaffWorkloadSummary = async (
    departmentId: string,
    academicYear: string
): Promise<{ staff_id: string; total_planned: number; total_actual: number }[]> => {
    const { data: staff } = await supabase
        .from('staff')
        .select('id')
        .eq('department_id', departmentId)
    const staffIds = staff?.map(s => s.id) || []
    if (staffIds.length === 0) return []

    const { data, error } = await supabase
        .from('staff_assignments')
        .select('staff_id, planned_hours, actual_hours')
        .in('staff_id', staffIds)
        .eq('academic_year', academicYear)
    if (error) throw error

    const summary: Record<string, { total_planned: number; total_actual: number }> = {}
    for (const row of data || []) {
        if (!summary[row.staff_id]) {
            summary[row.staff_id] = { total_planned: 0, total_actual: 0 }
        }
        summary[row.staff_id].total_planned += row.planned_hours
        summary[row.staff_id].total_actual += row.actual_hours
    }

    return Object.entries(summary).map(([staff_id, v]) => ({ staff_id, ...v }))

}
export const updateActualHours = async (
    id: string,
    actual_hours: number
): Promise<void> => {
    const { error } = await supabase
        .from('staff_assignments')
        .update({ actual_hours })
        .eq('id', id)
    if (error) throw error
}