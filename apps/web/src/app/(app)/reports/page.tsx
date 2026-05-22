'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { BarChart3, Clock, Users, TrendingUp, FileText, FolderOpen } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { Spinner } from '@/components/ui/spinner';

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
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  useEffect(() => { document.title = 'Reports | TeamTracker'; }, []);

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
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-text">Project Reports</span>
          <span className="text-xs text-text2 ml-auto">Progress, member breakdown, and time analysis per project</span>
        </div>
        {projectsLoading ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : projects.length === 0 ? (
          <p className="text-sm text-text2">No projects yet. <Link href="/projects" className="text-accent hover:underline">Create one →</Link></p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {projects.slice(0, 6).map(p => (
              <Link
                key={p.id}
                href={`/reports/project/${p.id}`}
                className="flex items-center gap-2.5 rounded-lg border border-c-border bg-surface2/50 p-3 hover:border-accent/40 hover:bg-surface2 transition-colors group"
              >
                <div className="rounded-md bg-accent/10 p-1.5 shrink-0">
                  <FolderOpen className="h-3.5 w-3.5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text truncate group-hover:text-accent transition-colors">
                    {p.title}
                  </p>
                  <p className="text-[10px] text-text2 capitalize">{p.status.replace('_', ' ')}</p>
                </div>
              </Link>
            ))}
            {projects.length > 6 && (
              <Link
                href="/projects"
                className="flex items-center justify-center rounded-lg border border-dashed border-c-border p-3 text-xs text-text2 hover:text-accent hover:border-accent/40 transition-colors"
              >
                +{projects.length - 6} more →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
