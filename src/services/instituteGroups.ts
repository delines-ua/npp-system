import { supabase } from './supabase'
import type { InstituteGroup, DisciplineGroupFull } from '../types/database'

export const getInstituteGroups = async (): Promise<InstituteGroup[]> => {
    const { data, error } = await supabase
        .from('institute_groups')
        .select('*')
        .order('faculty')
        .order('course', { ascending: false })
        .order('group_name')
    if (error) throw error
    return data || []
}

export const getDisciplineGroups = async (disciplineId: string): Promise<DisciplineGroupFull[]> => {
    const { data: dgData, error } = await supabase
        .from('discipline_groups')
        .select('*')
        .eq('discipline_id', disciplineId)
        .order('group_order')
    if (error) throw error
    if (!dgData || dgData.length === 0) return []

    const groupIds = dgData.map(dg => dg.group_id)
    const { data: groups } = await supabase
        .from('institute_groups')
        .select('*')
        .in('id', groupIds)

    const groupMap = Object.fromEntries((groups || []).map(g => [g.id, g]))
    return dgData.map(dg => ({ ...dg, group: groupMap[dg.group_id] })) as DisciplineGroupFull[]
}

// Перераховує disciplines.student_count = сума всіх прив'язаних груп
const syncDisciplineStudentCount = async (disciplineId: string): Promise<void> => {
    const { data } = await supabase
        .from('discipline_groups')
        .select('student_count')
        .eq('discipline_id', disciplineId)
    const total = (data || []).reduce((s, g) => s + (g.student_count || 0), 0)
    await supabase
        .from('disciplines')
        .update({ student_count: total })
        .eq('id', disciplineId)
}

export const addDisciplineGroup = async (
    disciplineId: string,
    groupId: string,
    studentCount: number,
    groupOrder: number,
    academicYear = '2025-2026'
): Promise<void> => {
    const { error } = await supabase
        .from('discipline_groups')
        .insert({ discipline_id: disciplineId, group_id: groupId, student_count: studentCount, group_order: groupOrder, academic_year: academicYear })
    if (error) throw error
    await syncDisciplineStudentCount(disciplineId)
}

export const removeDisciplineGroup = async (id: string, disciplineId: string): Promise<void> => {
    const { error } = await supabase
        .from('discipline_groups')
        .delete()
        .eq('id', id)
    if (error) throw error
    await syncDisciplineStudentCount(disciplineId)
}

export const updateDisciplineGroupCount = async (id: string, disciplineId: string, studentCount: number): Promise<void> => {
    const { error } = await supabase
        .from('discipline_groups')
        .update({ student_count: studentCount })
        .eq('id', id)
    if (error) throw error
    await syncDisciplineStudentCount(disciplineId)
}

// Авто-зв'язок: знаходить групи по кодах спеціальностей і прив'язує до дисципліни
// semester → course: 1-2→1, 3-4→2, 5-6→3, 7-8→4
export const autoLinkGroupsBySpecialty = async (
    disciplineId: string,
    specialtyCodes: string,   // "122,126"
    semester = 0,
    academicYear = '2025-2026'
): Promise<number> => {
    if (!specialtyCodes.trim()) return 0

    const codes = specialtyCodes.split(',').map(s => s.trim()).filter(Boolean)
    if (codes.length === 0) return 0

    const isMasters = semester >= 9
    const course = semester > 0
        ? (isMasters ? Math.ceil((semester - 8) / 2) : Math.ceil(semester / 2))
        : 0

    // Знаходимо групи з відповідними кодами спеціальностей (та курсом, якщо вказано)
    let query = supabase
        .from('institute_groups')
        .select('*')
        .in('specialty_code', codes)
        .eq('academic_year', academicYear)
        .eq('is_masters', isMasters)
    if (course > 0) query = query.eq('course', course)
    const { data: groups, error } = await query.order('group_name')
    if (error) throw error
    if (!groups || groups.length === 0) return 0

    // Видаляємо старі зв'язки
    await supabase.from('discipline_groups').delete().eq('discipline_id', disciplineId)

    // Вставляємо нові
    const inserts = groups.map((g, idx) => ({
        discipline_id: disciplineId,
        group_id: g.id,
        group_order: idx + 1,
        student_count: g.student_count,
        academic_year: academicYear,
    }))
    const { error: insErr } = await supabase.from('discipline_groups').insert(inserts)
    if (insErr) throw insErr

    await syncDisciplineStudentCount(disciplineId)
    return groups.length
}
