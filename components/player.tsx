'use client';

import * as React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle, ChevronUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { usePlayer } from '@/lib/player';
import { cn } from '@/lib/utils/cn';
import { NowPlaying } from '@/components/now-playing';

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
    if (!current || current.sourceType !== 'YOUTUBE' || current.streamUrl || !ytApiReady || !window.YT)
      return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isPlaying handled by separate effect to avoid recreating player
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
    if (current?.sourceType !== 'YOUTUBE' || current?.streamUrl) return;
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
    const el = audioRef.current;
    if (!el) return;
    if (player.isPlaying) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-fire when the track changes so a new element respects isPlaying
  }, [player.isPlaying, current?.id]);

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = player.muted ? 0 : player.volume;
    }
  }, [player.volume, player.muted]);

  if (!current) return null;

  const filePlayback = current.sourceType === 'AUTHORIZED_AUDIO' || !!current.streamUrl;
  const progressPercent = duration ? (progress / duration) * 100 : 0;

  function handleSeek(value: number) {
    if (!current) return;
    const target = (value / 100) * (duration || 0);
    player.seek(value / 100);
    if (filePlayback) {
      if (audioRef.current) audioRef.current.currentTime = target;
    } else {
      ytPlayer?.seekTo(target, true);
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
    <>
      {player.expanded && (
        <NowPlaying
          progress={progress}
          duration={duration}
          onSeek={handleSeek}
          onSeekStart={() => setSeeking(true)}
          onSeekEnd={() => setSeeking(false)}
        />
      )}

    <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-50 bg-black border-t border-white/5">
      {current.sourceType === 'YOUTUBE' && !current.streamUrl && (
        <div
          id={playerId}
          className="fixed bottom-24 md:bottom-20 right-3 z-50 w-44 h-24 sm:w-64 sm:h-36 rounded-lg overflow-hidden shadow-xl bg-black"
        />
      )}

      <div className="hidden">
        {filePlayback && (
          <audio
            ref={audioRef}
            src={current.streamUrl ?? current.sourceUrl}
            autoPlay={player.isPlaying}
            muted={player.muted}
            onTimeUpdate={handleAudioTimeUpdate}
            onLoadedMetadata={handleAudioLoadedMetadata}
            onEnded={() => nextRef.current()}
          />
        )}
      </div>

      <div className="flex h-16 md:h-20 items-center gap-2 px-2 sm:px-4">
        {/* Left: track info — click to expand */}
        <button
          onClick={() => player.setExpanded(true)}
          className="flex items-center gap-3 shrink-0 w-[40%] md:w-[30%] min-w-0 text-left hover:bg-white/5 -mx-2 px-2 py-1 rounded transition-colors"
          aria-label="Expand now playing"
        >
          {current.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.thumbnailUrl} alt={current.title} className="h-10 w-10 md:h-14 md:w-14 rounded object-cover shrink-0" />
          ) : (
            <div className="flex h-10 w-10 md:h-14 md:w-14 items-center justify-center rounded bg-muted shrink-0">
              <span className="text-xs">🎵</span>
            </div>
          )}
          <div className="min-w-0 hidden sm:block flex-1">
            <p className="truncate text-sm font-medium">{current.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {current.artist ?? current.channelName ?? 'Unknown'}
            </p>
          </div>
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
        </button>

        {/* Center: transport + seek */}
        <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              onClick={player.previous}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <button
              onClick={player.togglePlay}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-foreground hover:scale-110 transition-transform"
            >
              {player.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <Button
              size="icon"
              variant="ghost"
              onClick={player.next}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Seek bar — hidden on mobile, shown on sm+ */}
          <div className="hidden sm:flex w-full max-w-xl items-center gap-2 min-w-0">
            <span className="w-10 text-right text-[11px] text-muted-foreground tabular-nums">
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
              className="flex-1 h-1 cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--primary) ${progressPercent}%, var(--muted) ${progressPercent}%)`,
                borderRadius: 2,
                appearance: 'none',
              }}
            />
            <span className="w-10 text-[11px] text-muted-foreground tabular-nums">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right: shuffle/repeat/volume — hidden on mobile */}
        <div className="hidden md:flex items-center gap-2 shrink-0 w-[30%] justify-end">
          <Button
            size="icon"
            variant="ghost"
            onClick={player.toggleShuffle}
            className={cn(
              'h-8 w-8',
              player.shuffle ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
            title="Shuffle"
          >
            <Shuffle className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={player.toggleRepeat}
            className={cn(
              'h-8 w-8',
              player.repeat ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
            title="Repeat"
          >
            <Repeat className="h-4 w-4" />
          </Button>
          <div className="flex w-32 items-center gap-2 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => player.setMuted(!player.muted)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
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
              className="w-20 h-1 cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--foreground) ${(player.muted ? 0 : player.volume) * 100}%, var(--muted) ${(player.muted ? 0 : player.volume) * 100}%)`,
                borderRadius: 2,
                appearance: 'none',
              }}
            />
          </div>
        </div>
      </div>
    </div>
    </>
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
