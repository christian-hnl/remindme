import { timeToMinutes } from '@/lib/format';

interface Timed {
  id: string;
  startTime: string;
  endTime: string;
}

export interface Lane {
  lane: number;
  lanes: number;
}

/**
 * Places lessons of one day that overlap in time (parallel groups, split classes) into
 * side-by-side lanes instead of stacking them below each other.
 */
export function assignLanes<T extends Timed>(items: T[]): Map<string, Lane> {
  const sorted = [...items].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime) || timeToMinutes(a.endTime) - timeToMinutes(b.endTime)
  );
  const result = new Map<string, Lane>();
  let cluster: { id: string; lane: number }[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const lanes = Math.max(1, laneEnds.length);
    for (const entry of cluster) result.set(entry.id, { lane: entry.lane, lanes });
    cluster = [];
    laneEnds = [];
    clusterEnd = -1;
  };

  for (const item of sorted) {
    const start = timeToMinutes(item.startTime);
    const end = timeToMinutes(item.endTime);
    if (cluster.length > 0 && start >= clusterEnd) flush();
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane < 0) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    cluster.push({ id: item.id, lane });
    clusterEnd = Math.max(clusterEnd, end);
  }
  flush();
  return result;
}

/** Groups lessons that overlap in time, e.g. to show parallel groups in one row. */
export function groupOverlapping<T extends Omit<Timed, 'id'>>(items: T[]): T[][] {
  const sorted = [...items].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  const groups: T[][] = [];
  let groupEnd = -1;
  for (const item of sorted) {
    const start = timeToMinutes(item.startTime);
    if (groups.length > 0 && start < groupEnd) {
      groups[groups.length - 1].push(item);
    } else {
      groups.push([item]);
      groupEnd = -1;
    }
    groupEnd = Math.max(groupEnd, timeToMinutes(item.endTime));
  }
  return groups;
}
