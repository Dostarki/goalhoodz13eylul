import React from 'react';
import { CalendarCheck } from 'lucide-react';
import TaskCard from './TaskCard';

const DailyTasks = ({ tasks, participant, today, onComplete }) => {
  if (!tasks.length) return null;
  return (
    <div className="mt-12" data-testid="daily-tasks">
      <div className="label mb-3 flex items-center gap-2"><CalendarCheck size={12} /> Daily Tasks · resets at 00:00 UTC</div>
      <div className="space-y-3">
        {tasks.map((t) => (
          <TaskCard
            key={t.id}
            id={`daily-${t.id}`}
            title={t.title}
            desc={t.url ? t.url.replace(/^https?:\/\//, '') : 'Complete today and claim your points.'}
            points={t.points}
            url={t.url || 'https://x.com/goalhoodz'}
            done={participant.daily_done?.[t.id] === today}
            onComplete={() => onComplete(t.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default DailyTasks;
