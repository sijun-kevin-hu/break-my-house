import { useCallback, useEffect, useRef } from "react";

export default function useSound(
  src,
  {
    volume = 1,
    loop = false,
    preload = "none",
  } = {}
) {
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio();

    audio.volume = volume;
    audio.loop = loop;
    audio.preload = preload;
    if (preload !== "none") audio.src = src;

    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [src, volume, loop, preload]);

  const play = useCallback((startAt = 0) => {
    const audio = audioRef.current;

    if (!audio) return;

    if (!audio.getAttribute("src")) audio.src = src;
    audio.currentTime = startAt;

    audio.play().catch((err) => {
      console.warn("Unable to play sound:", err);
    });
  }, [src]);

  const stop = useCallback(() => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const load = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.getAttribute("src")) audio.src = src;
    audio.load();
  }, [src]);

  return {
    play,
    stop,
    pause,
    load,
    audio: audioRef,
  };
}
