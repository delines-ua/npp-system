# Tech debt: positional group identity in `workload_assignments`

**Status:** open · **Area:** workload distribution · **Risk:** data correctness (rare)
**Created:** 2026-07-08 · **Related code:** `src/utils/workload.ts`, `src/services/instituteGroups.ts`, `src/services/workloadAssignments.ts`, `src/pages/WorkloadDistributionPage.tsx`

## TL;DR

A teacher assignment identifies its group by a **positional `group_number`**
(a 1-based index over the discipline's current group list), not by the group's
stable identity. When a discipline's *group set* changes after assignments
exist, the index can point at a **different group** than the one the assignment
was made for. Any per-student recalculation (`recalcDisciplineAssignmentHours`)
then writes hours against the wrong headcount, or silently skips a slot.

The robust fix is a schema change (store `group_id` on `workload_assignments`).
That was deliberately **not** done as part of the student-count cascade work
because it requires a migration + backfill of live data.

## How the data models a group today

Student count flows through four layers, each a snapshot of the one above:

1. `institute_groups.student_count` — master, edited on the Groups page.
2. `discipline_groups.student_count` — per-link copy (a discipline ↔ group edge),
   with a `group_order` (1-based).
3. `disciplines.student_count` — sum of the discipline's links.
4. `workload_assignments.hours` / `.student_count` — frozen at assignment time.

An assignment row stores `discipline_id`, `staff_id`, `workload_type`,
`group_number`, `hours`, `student_count`. Crucially it does **not** store
`group_id`.

## The defect

`getApplicableSlots` (`src/utils/workload.ts`) numbers group-based slots by
**array position**:

```ts
for (let i = 0; i < groupCount; i++) {
    slots.push({ type: 'exam', groupNumber: i + 1, /* … */ studentCount: g.studentCount })
}
```

`buildGroupEntries` builds that array from `discipline_groups` ordered by
`group_order`, **filtering out links whose `institute_groups` row is missing**
(`dg.group == null`). Assignments are created with that same positional
`slot.groupNumber`, and `recalcDisciplineAssignmentHours` matches slots back to
assignments by `` `${type}|${group_number}` ``.

So the whole app assumes: *the i-th group is always the same group.* That holds
only until the group set changes. It breaks when:

- **A group is unlinked / re-ordered.** Remaining groups shift down a position.
- **`autoLinkGroupsBySpecialty` re-runs.** It deletes and re-inserts the
  discipline's links (but does **not** touch existing `workload_assignments`),
  so stored `group_number`s may no longer line up with the new positions.
- **A linked `institute_groups` row is deleted.** Historically this left a
  dangling link (`dg.group == null`) that `buildGroupEntries` filtered out,
  shifting positions. (Partially mitigated — see below.)

### Concrete failure

Discipline linked to `[A(order 1), B(order 2)]`; `course_work` assignments exist
with `group_number` 1 (A) and 2 (B). Group A is later unlinked. Now
`getApplicableSlots` returns just `[B]` numbered 1. Editing any group's student
count runs recalc, which matches slot `course_work|1` (**B**, e.g. 30 students →
180 h) onto the assignment stored as `course_work|1` (**created for A**). That
teacher's course-work hours are now computed from the wrong group, and the
former `group_number=2` assignment matches no slot and keeps stale hours.

## What was already mitigated (2026-07-08)

Fixes that shrink the corruption surface without the schema change:

- `deleteInstituteGroup` now **cascade-deletes** the group's `discipline_groups`
  links, re-syncs `disciplines.student_count`, and recalcs affected disciplines.
  This removes the dangling-link (`dg.group == null`) path and the associated
  student-count overcount.
- `propagateGroupStudentCount(groupId, newCount, prevCount?)` updates only links
  that still held the old group total, preserving per-discipline overrides.
- Input guard + `confirm()` on the Groups page prevents an accidental
  zero/empty count from cascading a workload wipe; `onError` surfaces partial,
  non-transactional writes.

These do **not** fix the core positional-identity problem — a surviving
assignment can still alias to a different group's position after a group-set
change.

## Proper fix (proposed)

Give assignments a stable group identity instead of a positional index.

1. **Schema:** add `workload_assignments.group_id uuid` (nullable; null for
   stream-level rows like lectures and for thesis rows). Optionally keep
   `group_number` for display/back-compat.
2. **Backfill:** for each existing assignment, resolve its `group_id` from the
   discipline's `discipline_groups` by matching `group_order == group_number`
   (the invariant that holds for all cleanly-created data — both were sequential
   at creation time). Log/park any row that can't be matched.
3. **Write path:** `assignSlot` persists `group_id` (carry it on `WorkloadSlot`,
   sourced from `discipline_groups.group_id`).
4. **Recalc / status / report:** match assignments to slots by `group_id` rather
   than by `` `${type}|${group_number}` ``. Slots for a removed group then find
   no assignment (correct), and an orphaned assignment finds no slot and can be
   flagged for cleanup instead of silently aliasing.
5. **Cleanup:** when a group is unlinked or deleted, delete its
   `workload_assignments` for that discipline (now unambiguous via `group_id`).

### Interim hardening (no migration)

If the migration is deferred further, at least fix `addDisciplineGroup` to
assign `group_order = max(existing order) + 1` instead of `links.length + 1`,
which can collide after a middle link is removed and corrupt the positional
mapping further.

## Why deferred

The migration touches the **live** production database (add column + backfill of
real assignment rows). That was explicitly out of scope for the student-count
cascade change and must be planned with a DB backup and a verification pass on a
copy, not run ad hoc. Track as a standalone task.
