import { useCallback, useEffect, useRef } from "react";

export default function useSound(
  src,
  {
    volume = 1,
    loop = false,
    preload = "auto",
  } = {}
) {
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio(src);

    audio.volume = volume;
    audio.loop = loop;
    audio.preload = preload;

    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [src, volume, loop, preload]);

  const play = useCallback((startAt = 0) => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.currentTime = startAt;

    audio.play().catch((err) => {
      console.warn("Unable to play sound:", err);
    });
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  return {
    play,
    stop,
    pause,
    audio: audioRef,
  };
}
