'use client';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTask } from '@/hooks/useTasks';
import { Spinner } from '@/components/ui/spinner';

export default function TaskRedirectPage() {
  const { id } = useParams<{ id: string }>();
  const { data: task, isError } = useTask(id);
  const router = useRouter();

  useEffect(() => {
    if (task) {
      router.replace(`/projects/${task.projectId}`);
    } else if (isError) {
      router.replace('/my-work');
    }
  }, [task, isError, router]);

  return (
    <div className="flex items-center justify-center h-full">
      <Spinner />
    </div>
  );
}
