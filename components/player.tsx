'use client';

import * as React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { usePlayer } from '@/lib/player';

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        options: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number; target: YTPlayer }) => void;
            onError?: (event: { data: number }) => void;
          };
        },
      ) => YTPlayer;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
}

let apiReady = false;
let loadingApi = false;
function loadYouTubeApi() {
  if (apiReady || loadingApi) return;
  loadingApi = true;
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  const firstScript = document.getElementsByTagName('script')[0];
  firstScript?.parentNode?.insertBefore(tag, firstScript);
}

let pendingReady: (() => void)[] = [];
if (typeof window !== 'undefined') {
  window.onYouTubeIframeAPIReady = () => {
    apiReady = true;
    pendingReady.forEach((fn) => fn());
    pendingReady = [];
  };
}

function onApiReady(fn: () => void) {
  if (apiReady && typeof window !== 'undefined' && window.YT) {
    fn();
  } else {
    pendingReady.push(fn);
    loadYouTubeApi();
  }
}

export function GlobalPlayer() {
  const player = usePlayer();
  const { current } = player;
  const [ytPlayer, setYtPlayer] = React.useState<YTPlayer | null>(null);
  const [duration, setDuration] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [seeking, setSeeking] = React.useState(false);
  const [ytApiReady, setYtApiReady] = React.useState(false);
  const playerId = React.useMemo(() => `yt-player-${Math.random().toString(36).slice(2, 9)}`, []);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const nextRef = React.useRef<() => void>(() => {});

  React.useEffect(() => {
    nextRef.current = player.next;
  });

  React.useEffect(() => {
    onApiReady(() => setYtApiReady(true));
  }, []);

  React.useEffect(() => {
    if (!current || current.sourceType !== 'YOUTUBE' || !ytApiReady || !window.YT) return;
    const videoId = extractYouTubeId(current.sourceUrl);
    if (!videoId) return;

    let destroyed = false;
    let p: YTPlayer | null = null;

    try {
      p = new window.YT.Player(playerId, {
        videoId,
        playerVars: {
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : '',
        },
        events: {
          onReady: (event) => {
            if (destroyed) return;
            const target = event.target;
            setYtPlayer(target);
            setDuration(target.getDuration() || 0);
            if (player.isPlaying) {
              setTimeout(() => {
                if (!destroyed) target.playVideo();
              }, 100);
            } else {
              target.pauseVideo();
            }
          },
          onStateChange: (event) => {
            if (destroyed) return;
            const YT = window.YT;
            if (!YT) return;
            if (event.data === YT.PlayerState.ENDED) {
              nextRef.current();
            }
          },
          onError: () => {
            if (destroyed) return;
            nextRef.current();
          },
        },
      });
    } catch {
      // Player creation failed — skip to next
      nextRef.current();
    }

    return () => {
      destroyed = true;
      try { p?.destroy(); } catch {}
      setYtPlayer(null);
    };
  }, [current?.id, current?.sourceUrl, current?.sourceType, ytApiReady, playerId]);

  React.useEffect(() => {
    if (!ytPlayer) return;
    try {
      if (player.isPlaying) {
        ytPlayer.playVideo();
      } else {
        ytPlayer.pauseVideo();
      }
    } catch {}
  }, [player.isPlaying, ytPlayer]);

  React.useEffect(() => {
    if (!ytPlayer) return;
    try {
      ytPlayer.setVolume(player.muted ? 0 : Math.round(player.volume * 100));
    } catch {}
  }, [player.volume, player.muted, ytPlayer]);

  React.useEffect(() => {
    if (ytPlayer && !seeking) {
      try {
        const currentTime = ytPlayer.getCurrentTime();
        if (Math.abs(currentTime - player.progress) > 2) {
          ytPlayer.seekTo(player.progress, true);
        }
      } catch {}
    }
  }, [player.progress, seeking, ytPlayer]);

  React.useEffect(() => {
    if (current?.sourceType !== 'YOUTUBE') return;
    const id = setInterval(() => {
      if (ytPlayer && !seeking) {
        try {
          const currentTime = ytPlayer.getCurrentTime();
          const dur = ytPlayer.getDuration();
          if (dur > 0) {
            setProgress(currentTime);
            setDuration(dur);
            player.setProgress(currentTime, dur);
          }
        } catch {}
      }
    }, 500);
    return () => clearInterval(id);
  }, [current?.sourceType, ytPlayer, seeking, player]);

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = player.muted ? 0 : player.volume;
    }
  }, [player.volume, player.muted]);

  if (!current) return null;

  const progressPercent = duration ? (progress / duration) * 100 : 0;

  function handleSeek(value: number) {
    if (!current) return;
    const target = (value / 100) * (duration || 0);
    player.seek(value / 100);
    if (current.sourceType === 'YOUTUBE') {
      ytPlayer?.seekTo(target, true);
    } else if (audioRef.current) {
      audioRef.current.currentTime = target;
    }
    setProgress(target);
  }

  function handleAudioTimeUpdate(e: React.SyntheticEvent<HTMLAudioElement>) {
    const target = e.currentTarget;
    if (target.duration && target.duration > 0) {
      setProgress(target.currentTime);
      setDuration(target.duration);
      player.setProgress(target.currentTime, target.duration);
    }
  }

  function handleAudioLoadedMetadata(e: React.SyntheticEvent<HTMLAudioElement>) {
    setDuration(e.currentTarget.duration);
    player.setProgress(e.currentTarget.currentTime, e.currentTarget.duration);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      {current.sourceType === 'YOUTUBE' && (
        <div
          id={playerId}
          className="fixed bottom-24 right-3 z-50 w-44 h-24 sm:w-64 sm:h-36 rounded-lg overflow-hidden shadow-xl bg-black"
        />
      )}

      <div className="hidden">
        {current.sourceType === 'AUTHORIZED_AUDIO' && (
          <audio
            ref={audioRef}
            src={current.sourceUrl}
            autoPlay={player.isPlaying}
            muted={player.muted}
            onTimeUpdate={handleAudioTimeUpdate}
            onLoadedMetadata={handleAudioLoadedMetadata}
            onEnded={() => nextRef.current()}
          />
        )}
      </div>

      <div className="flex h-20 items-center gap-2 px-3 sm:gap-4 sm:px-4">
        {current.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.thumbnailUrl} alt={current.title} className="h-12 w-12 sm:h-14 sm:w-14 rounded object-cover shrink-0" />
        ) : (
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded bg-muted shrink-0">
            <span className="text-xs">🎵</span>
          </div>
        )}

        <div className="w-24 sm:w-40 min-w-0 shrink-0">
          <p className="truncate font-medium text-xs sm:text-sm">{current.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {current.artist ?? current.channelName ?? 'Unknown'}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button size="icon" variant="ghost" onClick={player.previous} className="h-8 w-8 sm:h-9 sm:w-9">
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button size="icon" onClick={player.togglePlay} className="h-9 w-9 sm:h-10 sm:w-10 rounded-full">
            {player.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" onClick={player.next} className="h-8 w-8 sm:h-9 sm:w-9">
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Seek bar — hidden on mobile, shown on sm+ */}
        <div className="hidden sm:flex flex-1 items-center gap-3 min-w-0">
          <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
            {formatTime(progress)}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progressPercent}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            onMouseDown={() => setSeeking(true)}
            onMouseUp={() => setSeeking(false)}
            onTouchStart={() => setSeeking(true)}
            onTouchEnd={() => setSeeking(false)}
            className="flex-1 accent-primary h-1.5 cursor-pointer appearance-none rounded-lg bg-muted"
          />
          <span className="w-12 text-xs text-muted-foreground tabular-nums">
            {formatTime(duration)}
          </span>
        </div>

        {/* Mobile seek bar — compact */}
        <div className="flex sm:hidden flex-1 items-center min-w-0">
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progressPercent}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            onMouseDown={() => setSeeking(true)}
            onMouseUp={() => setSeeking(false)}
            onTouchStart={() => setSeeking(true)}
            onTouchEnd={() => setSeeking(false)}
            className="flex-1 accent-primary h-1.5 cursor-pointer appearance-none rounded-lg bg-muted"
          />
        </div>

        {/* Shuffle/repeat — hidden on mobile */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          <Button
            size="icon"
            variant={player.shuffle ? 'default' : 'ghost'}
            onClick={player.toggleShuffle}
            className="h-8 w-8"
          >
            <Shuffle className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant={player.repeat ? 'default' : 'ghost'}
            onClick={player.toggleRepeat}
            className="h-8 w-8"
          >
            <Repeat className="h-4 w-4" />
          </Button>
        </div>

        {/* Volume — hidden on mobile */}
        <div className="hidden md:flex w-40 items-center gap-2 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => player.setMuted(!player.muted)}
            className="h-8 w-8"
          >
            {player.muted || player.volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={player.muted ? 0 : player.volume}
            onChange={(e) => player.setVolume(parseFloat(e.target.value))}
            className="w-24 accent-primary h-1.5 cursor-pointer appearance-none rounded-lg bg-muted"
          />
        </div>
      </div>
    </div>
  );
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null;
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v') ?? u.pathname.split('/').pop() ?? null;
    return null;
  } catch {
    return null;
  }
}

function formatTime(seconds: number) {
  if (!seconds || Number.isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
