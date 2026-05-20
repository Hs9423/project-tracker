'use client';
import Link from 'next/link';
import { BarChart3, Clock, Users, TrendingUp, FileText } from 'lucide-react';

const REPORT_CARDS = [
  {
    href: '/reports/team',
    icon: Users,
    title: 'Team Productivity',
    description: 'Tasks completed, hours logged, overdue counts and average completion time per person.',
    color: 'text-accent',
    bg: 'bg-accent/10',
  },
  {
    href: '/reports/time',
    icon: Clock,
    title: 'Time Tracking',
    description: 'Detailed time logs grouped by person and project with daily breakdowns.',
    color: 'text-green',
    bg: 'bg-green/10',
  },
  {
    href: '/reports/workload',
    icon: BarChart3,
    title: 'Workload',
    description: 'Task count, estimated vs logged hours, and load percentage per team member.',
    color: 'text-amber',
    bg: 'bg-amber/10',
  },
] as const;

export default function ReportsIndexPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-accent" />
        <h1 className="text-2xl font-bold text-text">Reports</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {REPORT_CARDS.map(card => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-xl border border-c-border bg-surface p-6 hover:border-accent/40 transition-colors group"
            >
              <div className={`w-11 h-11 rounded-lg ${card.bg} flex items-center justify-center mb-4`}>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <h2 className="text-base font-semibold text-text mb-1 group-hover:text-accent transition-colors">
                {card.title}
              </h2>
              <p className="text-sm text-text2 leading-relaxed">{card.description}</p>
            </Link>
          );
        })}
      </div>

      <div className="rounded-xl border border-c-border bg-surface p-6">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-text2" />
          <span className="text-sm font-semibold text-text">Project Reports</span>
        </div>
        <p className="text-sm text-text2 mb-4">
          View per-project progress, member breakdown, and time analysis. Navigate to any project and use the
          <span className="text-accent font-medium"> Reports</span> tab, or pick a project below.
        </p>
        <Link href="/projects" className="text-sm text-accent hover:underline">
          Browse projects →
        </Link>
      </div>
    </div>
  );
}
