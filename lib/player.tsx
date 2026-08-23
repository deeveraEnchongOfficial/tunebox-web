'use client';

import * as React from 'react';

export interface QueueItem {
  id: string;
  title: string;
  artist: string | null;
  channelName: string | null;
  thumbnailUrl: string | null;
  sourceUrl: string;
  sourceType: 'YOUTUBE' | 'AUTHORIZED_AUDIO';
  durationSeconds: number | null;
}

interface PlayerState {
  queue: QueueItem[];
  index: number;
  isPlaying: boolean;
  isReady: boolean;
  progress: number;
  duration: number;
  volume: number;
  muted: boolean;
  repeat: boolean;
  shuffle: boolean;
  expanded: boolean;
}

interface PlayerContextValue extends PlayerState {
  current: QueueItem | null;
  playTrack: (item: QueueItem, queue?: QueueItem[]) => void;
  playQueue: (queue: QueueItem[], index?: number) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (fraction: number) => void;
  setProgress: (progress: number, duration: number) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  setReady: (ready: boolean) => void;
  setExpanded: (expanded: boolean) => void;
}

const PlayerContext = React.createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = React.useState<QueueItem[]>([]);
  const [index, setIndex] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isReady, setIsReady] = React.useState(false);
  const [progress, setProgressState] = React.useState(0);
  const [duration, setDurationState] = React.useState(0);
  const [volume, setVolumeState] = React.useState(0.8);
  const [muted, setMutedState] = React.useState(false);
  const [repeat, setRepeat] = React.useState(false);
  const [shuffle, setShuffle] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  const current = queue[index] ?? null;

  function playTrack(item: QueueItem, newQueue?: QueueItem[]) {
    const q = newQueue ?? [item];
    const i = q.findIndex((it) => it.id === item.id);
    setQueue(q);
    setIndex(i >= 0 ? i : 0);
    setIsPlaying(true);
    setIsReady(false);
    setProgressState(0);
    setDurationState(item.durationSeconds ?? 0);
  }

  function playQueue(newQueue: QueueItem[], startIndex = 0) {
    if (newQueue.length === 0) return;
    setQueue(newQueue);
    setIndex(Math.min(startIndex, newQueue.length - 1));
    setIsPlaying(true);
    setIsReady(false);
    setProgressState(0);
    setDurationState(newQueue[startIndex]?.durationSeconds ?? 0);
  }

  function togglePlay() {
    setIsPlaying((p) => !p);
  }

  function next() {
    if (queue.length === 0) return;
    let nextIndex: number;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (index + 1 < queue.length) {
      nextIndex = index + 1;
    } else if (repeat) {
      nextIndex = 0;
    } else {
      setIsPlaying(false);
      return;
    }
    setIndex(nextIndex);
    setIsPlaying(true);
    setIsReady(false);
    setProgressState(0);
    setDurationState(queue[nextIndex]?.durationSeconds ?? 0);
  }

  function previous() {
    if (queue.length === 0) return;
    let prevIndex: number;
    if (index > 0) {
      prevIndex = index - 1;
    } else if (repeat) {
      prevIndex = queue.length - 1;
    } else {
      return;
    }
    setIndex(prevIndex);
    setIsPlaying(true);
    setIsReady(false);
    setProgressState(0);
    setDurationState(queue[prevIndex]?.durationSeconds ?? 0);
  }

  function seek(fraction: number) {
    setProgressState(fraction * duration);
  }

  function setProgress(seconds: number, dur: number) {
    setProgressState(seconds);
    setDurationState(dur);
  }

  function setVolume(v: number) {
    setVolumeState(v);
    setMutedState(false);
  }

  function setMuted(m: boolean) {
    setMutedState(m);
  }

  function toggleRepeat() {
    setRepeat((r) => !r);
  }

  function toggleShuffle() {
    setShuffle((s) => !s);
  }

  return (
    <PlayerContext.Provider
      value={{
        queue,
        index,
        isPlaying,
        isReady,
        progress,
        duration,
        volume,
        muted,
        repeat,
        shuffle,
        expanded,
        current,
        playTrack,
        playQueue,
        togglePlay,
        next,
        previous,
        seek,
        setProgress,
        setVolume,
        setMuted,
        toggleRepeat,
        toggleShuffle,
        setReady: setIsReady,
        setExpanded,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = React.useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within a PlayerProvider');
  return ctx;
}
