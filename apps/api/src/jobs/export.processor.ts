import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { HierarchyService } from '../users/hierarchy.service';
import { ExportReportDto } from '../reports/dto/export-report.dto';

interface ExportJob extends ExportReportDto {
  userId: string;
}

function ensureExportsDir(): string {
  const dir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  const header = keys.join(',');
  const lines = rows.map(row =>
    keys.map(k => {
      const val = row[k] ?? '';
      const str = String(val).replace(/"/g, '""');
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
    }).join(','),
  );
  return [header, ...lines].join('\n');
}

async function toPdf(html: string): Promise<Buffer> {
  // lazy require to avoid issues when puppeteer not available
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const puppeteer = require('puppeteer') as typeof import('puppeteer');
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  const pdf = await page.pdf({ format: 'A4', margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } });
  await browser.close();
  return Buffer.from(pdf);
}

async function toExcel(title: string, rows: Record<string, unknown>[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(title);
  if (rows.length) {
    const keys = Object.keys(rows[0]);
    sheet.columns = keys.map(k => ({ header: k, key: k, width: 20 }));
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    rows.forEach(row => sheet.addRow(row));
  }
  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}

function reportHtml(title: string, rows: Record<string, unknown>[]): string {
  if (!rows.length) return `<html><body><h1>${title}</h1><p>No data.</p></body></html>`;
  const keys = Object.keys(rows[0]);
  const thead = `<tr>${keys.map(k => `<th>${k}</th>`).join('')}</tr>`;
  const tbody = rows.map(row =>
    `<tr>${keys.map(k => `<td>${row[k] ?? ''}</td>`).join('')}</tr>`
  ).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:20px}
  h1{font-size:18px;margin-bottom:12px}
  table{border-collapse:collapse;width:100%}
  th{background:#1e293b;color:#fff;padding:6px 8px;text-align:left;font-size:11px}
  td{padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:11px}
  tr:nth-child(even) td{background:#f8fafc}
</style>
</head>
<body>
<h1>${title}</h1>
<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>
</body>
</html>`;
}

@Processor('export')
export class ExportProcessor {
  constructor(
    private prisma: PrismaService,
    private hierarchy: HierarchyService,
  ) {}

  @Process('generate')
  async handleGenerate(job: Job<ExportJob>): Promise<void> {
    const { type, format, filters = {}, userId } = job.data;
    const rows = await this.buildRows(type, filters, userId);
    const dir = ensureExportsDir();
    const filePath = path.join(dir, `${job.id}.${format}`);

    if (format === 'csv') {
      fs.writeFileSync(filePath, toCsv(rows), 'utf-8');
    } else if (format === 'xlsx') {
      const buf = await toExcel(type, rows);
      fs.writeFileSync(filePath, buf);
    } else {
      const html = reportHtml(type, rows);
      const buf = await toPdf(html);
      fs.writeFileSync(filePath, buf);
    }
  }

  private async buildRows(
    type: string,
    filters: Record<string, string>,
    userId: string,
  ): Promise<Record<string, unknown>[]> {
    if (type === 'project' && filters.projectId) {
      return this.buildProjectRows(filters.projectId);
    }
    if (type === 'team-productivity') {
      return this.buildTeamRows(userId, filters.from, filters.to);
    }
    if (type === 'time-tracking') {
      return this.buildTimeRows(userId, filters);
    }
    if (type === 'workload') {
      return this.buildWorkloadRows(userId, filters.from, filters.to);
    }
    return [];
  }

  private async buildProjectRows(projectId: string): Promise<Record<string, unknown>[]> {
    const tasks = await this.prisma.task.findMany({
      where: { projectId, deletedAt: null },
      include: {
        assignee: { select: { name: true } },
        timeLogs: { select: { hours: true } },
      },
    });
    return tasks.map(t => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      assignee: t.assignee?.name ?? '',
      estimatedHours: t.estimatedHours ? Number(t.estimatedHours) : '',
      loggedHours: t.timeLogs.reduce((s, l) => s + Number(l.hours), 0),
      dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : '',
    }));
  }

  private async buildTeamRows(userId: string, from?: string, to?: string): Promise<Record<string, unknown>[]> {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400_000);
    const toDate = to ? new Date(to) : new Date();
    const descendants = await this.hierarchy.getDescendants(userId);
    const userIds = [userId, ...descendants.map(d => d.id)];
    const users = await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });

    const rows = await Promise.all(users.map(async u => {
      const done = await this.prisma.task.count({ where: { assigneeId: u.id, status: 'done', updatedAt: { gte: fromDate, lte: toDate }, deletedAt: null } });
      const overdue = await this.prisma.task.count({ where: { assigneeId: u.id, status: { not: 'done' }, dueDate: { lt: toDate }, deletedAt: null } });
      const logs = await this.prisma.timeLog.findMany({ where: { userId: u.id, date: { gte: fromDate, lte: toDate } }, select: { hours: true } });
      const hours = logs.reduce((s, l) => s + Number(l.hours), 0);
      return { name: u.name, tasksCompleted: done, hoursLogged: Math.round(hours * 100) / 100, overdueCount: overdue };
    }));
    return rows.sort((a, b) => (b.tasksCompleted as number) - (a.tasksCompleted as number));
  }

  private async buildTimeRows(userId: string, filters: Record<string, string>): Promise<Record<string, unknown>[]> {
    const from = filters.from ? new Date(filters.from) : undefined;
    const to = filters.to ? new Date(filters.to) : undefined;
    const descendants = await this.hierarchy.getDescendants(userId);
    const allowedIds = [userId, ...descendants.map(d => d.id)];

    const logs = await this.prisma.timeLog.findMany({
      where: {
        userId: filters.userId ? filters.userId : { in: allowedIds },
        ...(filters.projectId ? { task: { projectId: filters.projectId } } : {}),
        ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      include: {
        user: { select: { name: true } },
        task: { select: { title: true, project: { select: { title: true } } } },
      },
      orderBy: { date: 'asc' },
    });

    return logs.map(l => ({
      date: l.date.toISOString().slice(0, 10),
      person: l.user.name,
      project: (l.task.project as { title: string }).title,
      task: l.task.title,
      hours: Number(l.hours),
      note: l.note ?? '',
    }));
  }

  private async buildWorkloadRows(userId: string, from?: string, to?: string): Promise<Record<string, unknown>[]> {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400_000);
    const toDate = to ? new Date(to) : new Date();
    const descendants = await this.hierarchy.getDescendants(userId);
    const userIds = [userId, ...descendants.map(d => d.id)];
    const users = await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });

    const workdays = (() => {
      let count = 0;
      const cur = new Date(fromDate);
      while (cur <= toDate) {
        const day = cur.getDay();
        if (day !== 0 && day !== 6) count++;
        cur.setDate(cur.getDate() + 1);
      }
      return count || 1;
    })();

    return Promise.all(users.map(async u => {
      const tasks = await this.prisma.task.findMany({ where: { assigneeId: u.id, deletedAt: null }, select: { status: true, estimatedHours: true, dueDate: true } });
      const logs = await this.prisma.timeLog.findMany({ where: { userId: u.id, date: { gte: fromDate, lte: toDate } }, select: { hours: true } });
      const logged = logs.reduce((s, l) => s + Number(l.hours), 0);
      const estimated = tasks.reduce((s, t) => s + Number(t.estimatedHours ?? 0), 0);
      const overdue = tasks.filter(t => t.status !== 'done' && t.dueDate && t.dueDate < toDate).length;
      const load = Math.round((logged / (workdays * 8)) * 100);
      return { name: u.name, taskCount: tasks.length, estimatedHours: Math.round(estimated * 100) / 100, loggedHours: Math.round(logged * 100) / 100, overdueCount: overdue, loadPercent: `${load}%` };
    }));
  }
}
