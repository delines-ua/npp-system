import { supabase } from './supabase'
import type { ScientificWork } from '../types/database'
import type { ScientificWorkType } from '../utils/lawNorms'
import { SCIENTIFIC_WORK_TYPES } from '../utils/lawNorms'

export const getScientificWorks = async (
    departmentId: string,
    academicYear: string
): Promise<ScientificWork[]> => {
    const { data: staffList } = await supabase
        .from('staff')
        .select('id')
        .eq('department_id', departmentId)
    const staffIds = staffList?.map(s => s.id) || []
    if (staffIds.length === 0) return []

    const { data, error } = await supabase
        .from('scientific_works')
        .select('*')
        .in('staff_id', staffIds)
        .eq('academic_year', academicYear)
        .order('created_at')
    if (error) throw error
    return data || []
}

export const getScientificWorksByStaff = async (
    staffId: string,
    academicYear: string
): Promise<ScientificWork[]> => {
    const { data, error } = await supabase
        .from('scientific_works')
        .select('*')
        .eq('staff_id', staffId)
        .eq('academic_year', academicYear)
        .order('created_at')
    if (error) throw error
    return data || []
}

export const createScientificWork = async (
    staffId: string,
    departmentId: string,
    workType: ScientificWorkType,
    studentCount: number,
    notes: string,
    academicYear: string
): Promise<ScientificWork> => {
    const meta = SCIENTIFIC_WORK_TYPES[workType]
    const hours = Math.round(meta.hours * studentCount * 10) / 10

    const { data, error } = await supabase
        .from('scientific_works')
        .insert({
            staff_id: staffId,
            department_id: departmentId,
            work_type: workType,
            student_count: studentCount,
            hours,
            notes,
            academic_year: academicYear,
        })
        .select()
        .single()
    if (error) throw error
    return data
}

export const updateScientificWork = async (
    id: string,
    studentCount: number,
    notes: string,
    workType: ScientificWorkType
): Promise<void> => {
    const meta = SCIENTIFIC_WORK_TYPES[workType]
    const hours = Math.round(meta.hours * studentCount * 10) / 10

    const { error } = await supabase
        .from('scientific_works')
        .update({ student_count: studentCount, hours, notes })
        .eq('id', id)
    if (error) throw error
}

export const deleteScientificWork = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('scientific_works')
        .delete()
        .eq('id', id)
    if (error) throw error
}
