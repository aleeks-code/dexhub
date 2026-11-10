import { Injectable } from '@nestjs/common'
import type { BackupJob } from '@dexhub/db'

function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function yearMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function sortByCompletedDesc(jobs: BackupJob[]): BackupJob[] {
  return [...jobs].sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))
}

@Injectable()
export class BackupRotationService {
  classify(existingJobs: BackupJob[]): 'daily' | 'weekly' | 'monthly' {
    const now = new Date()
    const completed = existingJobs.filter((j) => j.status === 'completed' && j.type !== 'manual')

    const hasMonthlyThisMonth = completed.some(
      (j) =>
        j.type === 'monthly' && j.completedAt && yearMonthKey(j.completedAt) === yearMonthKey(now),
    )
    if (!hasMonthlyThisMonth) return 'monthly'

    const hasWeeklyThisWeek = completed.some(
      (j) =>
        j.type === 'weekly' && j.completedAt && isoWeekKey(j.completedAt) === isoWeekKey(now),
    )
    if (!hasWeeklyThisWeek) return 'weekly'

    return 'daily'
  }

  getExpiredIds(jobs: BackupJob[]): string[] {
    const completed = jobs.filter((j) => j.status === 'completed')
    const daily = sortByCompletedDesc(completed.filter((j) => j.type === 'daily'))
    const weekly = sortByCompletedDesc(completed.filter((j) => j.type === 'weekly'))
    const monthly = sortByCompletedDesc(completed.filter((j) => j.type === 'monthly'))
    // manual backups are never auto-deleted

    return [...daily.slice(7), ...weekly.slice(4), ...monthly.slice(12)].map((j) => j.id)
  }
}
