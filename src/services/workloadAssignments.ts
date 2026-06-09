import { supabase } from './supabase'
import type { DetailedAssignment, WorkloadTypeKey } from '../types/database'

export const getDetailedAssignments = async (disciplineIds: string[]): Promise<DetailedAssignment[]> => {
    if (disciplineIds.length === 0) return []
    const { data, error } = await supabase
        .from('workload_assignments')
        .select('*')
        .in('discipline_id', disciplineIds)
        .order('created_at')
    if (error) throw error
    return data || []
}

export const assignSlot = async (
    disciplineId: string,
    staffId: string,
    workloadType: WorkloadTypeKey,
    groupNumber: number,
    hours: number,
    studentCount: number = 0,
    academicYear: string = '2025-2026'
): Promise<void> => {
    // Для звичайних типів: один НПП на слот (видаляємо попереднє призначення)
    await supabase
        .from('workload_assignments')
        .delete()
        .eq('discipline_id', disciplineId)
        .eq('workload_type', workloadType)
        .eq('group_number', groupNumber)

    const { error } = await supabase
        .from('workload_assignments')
        .insert({
            discipline_id: disciplineId,
            staff_id: staffId,
            workload_type: workloadType,
            group_number: groupNumber,
            hours,
            student_count: studentCount,
            academic_year: academicYear,
        })
    if (error) throw error
}

export const clearSlot = async (
    disciplineId: string,
    workloadType: WorkloadTypeKey,
    groupNumber: number
): Promise<void> => {
    const { error } = await supabase
        .from('workload_assignments')
        .delete()
        .eq('discipline_id', disciplineId)
        .eq('workload_type', workloadType)
        .eq('group_number', groupNumber)
    if (error) throw error
}

export const assignThesis = async (
    disciplineId: string,
    staffId: string,
    type: 'bachelor_thesis' | 'master_thesis',
    studentCount: number,
    academicYear: string = '2025-2026'
): Promise<void> => {
    const hoursPerStudent = type === 'bachelor_thesis' ? 30 : 50
    const hours = studentCount * hoursPerStudent

    // Один запис на НПП+тип у межах дисципліни (оновлення якщо вже є)
    await supabase
        .from('workload_assignments')
        .delete()
        .eq('discipline_id', disciplineId)
        .eq('staff_id', staffId)
        .eq('workload_type', type)

    if (studentCount > 0) {
        const { error } = await supabase
            .from('workload_assignments')
            .insert({
                discipline_id: disciplineId,
                staff_id: staffId,
                workload_type: type,
                group_number: 0,
                hours,
                student_count: studentCount,
                academic_year: academicYear,
            })
        if (error) throw error
    }
}

export const getAssignmentsByStaffIds = async (staffIds: string[], academicYear = '2025-2026'): Promise<DetailedAssignment[]> => {
    if (staffIds.length === 0) return []
    const { data, error } = await supabase
        .from('workload_assignments')
        .select('*')
        .in('staff_id', staffIds)
        .eq('academic_year', academicYear)
    if (error) throw error
    return data || []
}

export const getAssignmentsByStaff = async (staffId: string, academicYear = '2025-2026'): Promise<DetailedAssignment[]> => {
    const { data, error } = await supabase
        .from('workload_assignments')
        .select('*')
        .eq('staff_id', staffId)
        .eq('academic_year', academicYear)
        .order('created_at')
    if (error) throw error
    return data || []
}

export const deleteDetailedAssignment = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('workload_assignments')
        .delete()
        .eq('id', id)
    if (error) throw error
}

// HARD RESET: видаляє ВСІ розподілені години (призначення НПП) за навчальний рік.
// Незворотна дія — використовується лише з підтвердженням «DELETE».
export const resetWorkloadAssignments = async (academicYear: string): Promise<number> => {
    const { data, error } = await supabase
        .from('workload_assignments')
        .delete()
        .eq('academic_year', academicYear)
        .select('id')
    if (error) throw error
    return data?.length ?? 0
}
