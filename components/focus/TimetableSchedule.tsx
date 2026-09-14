'use client';

import React, { useState, useEffect } from 'react';
import { ScheduleBlock } from '@/types';
import { Clock, MapPin, Sparkles, BookOpen } from 'lucide-react';

interface TimetableScheduleProps {
  schedule: ScheduleBlock[];
}

export const TimetableSchedule: React.FC<TimetableScheduleProps> = ({ schedule }) => {
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [currentMinutesFromMidnight, setCurrentMinutesFromMidnight] = useState(0);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const mins = now.getMinutes();
      setCurrentTimeStr(
        `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
      );
      setCurrentMinutesFromMidnight(hours * 60 + mins);
    };

    updateTime();
    const interval = setInterval(updateTime, 30000); // update every 30s
    return () => clearInterval(interval);
  }, []);

  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Find currently active block or next upcoming
  const activeBlock = schedule.find((block) => {
    const start = timeToMinutes(block.startTime);
    const end = timeToMinutes(block.endTime);
    return currentMinutesFromMidnight >= start && currentMinutesFromMidnight <= end;
  });

  const nextBlock = !activeBlock
    ? schedule.find((block) => timeToMinutes(block.startTime) > currentMinutesFromMidnight)
    : null;

  return (
    <div className="rounded-3xl bg-[#11141D] border border-white/[0.06] p-5 shadow-bento glow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight">Tagesplan & Vorlesungen</h2>
            <p className="text-[11px] text-muted">Montag • Live Time-Indicator</p>
          </div>
        </div>

        {/* Live Clock Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-ping" />
          <span>{currentTimeStr || '12:00'}</span>
        </div>
      </div>

      {/* Active or Next Upcoming Spotlight Pill */}
      {activeBlock ? (
        <div className="mb-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 p-3.5 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-purple-300 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              JETZT AKTIV
            </span>
            <span className="font-mono text-purple-200">
              noch {timeToMinutes(activeBlock.endTime) - currentMinutesFromMidnight} Min
            </span>
          </div>
          <div className="text-sm font-semibold text-white">{activeBlock.title}</div>
          <div className="flex items-center gap-3 text-xs text-purple-300/80 mt-1">
            <span>{activeBlock.startTime} - {activeBlock.endTime}</span>
            {activeBlock.room && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {activeBlock.room}
              </span>
            )}
          </div>
        </div>
      ) : nextBlock ? (
        <div className="mb-4 rounded-2xl bg-[#1A1F2C] border border-white/5 p-3 text-xs flex items-center justify-between">
          <div className="text-muted">
            Nächste: <span className="text-white font-medium">{nextBlock.title}</span>
          </div>
          <div className="font-mono text-indigo-400 font-medium">
            in {timeToMinutes(nextBlock.startTime) - currentMinutesFromMidnight} Min ({nextBlock.startTime})
          </div>
        </div>
      ) : null}

      {/* Timeline Schedule Items */}
      <div className="space-y-2.5 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
        {schedule.map((block) => {
          const startMin = timeToMinutes(block.startTime);
          const endMin = timeToMinutes(block.endTime);
          const isPassed = currentMinutesFromMidnight > endMin;
          const isCurrent = currentMinutesFromMidnight >= startMin && currentMinutesFromMidnight <= endMin;

          return (
            <div
              key={block.id}
              className={`relative pl-7 transition-all ${
                isPassed ? 'opacity-40' : 'opacity-100'
              }`}
            >
              {/* Timeline Bullet */}
              <div
                className={`absolute left-2 top-2 h-2.5 w-2.5 rounded-full -translate-x-1/2 border-2 border-[#11141D] ${
                  isCurrent
                    ? 'bg-purple-400 ring-4 ring-purple-500/30'
                    : isPassed
                    ? 'bg-muted'
                    : 'bg-indigo-400'
                }`}
              />

              <div className="rounded-xl bg-[#161B26] p-2.5 border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-mono text-muted text-[11px]">
                    {block.startTime} – {block.endTime}
                  </span>
                  {block.room && (
                    <span className="text-[10px] text-muted-dark flex items-center gap-0.5">
                      <MapPin className="h-2.5 w-2.5" />
                      {block.room}
                    </span>
                  )}
                </div>
                <div className="text-xs font-medium text-white/95">{block.title}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
