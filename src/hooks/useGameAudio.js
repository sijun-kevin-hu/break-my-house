import { useEffect, useRef } from "react";
import useSound from "./useSound";
import { useGameStore } from "../store/useGameStore";

export default function useGameAudio() {
  const triggered = useGameStore((state) => state.triggered);
  const preventions = useGameStore((state) => state.preventions);

  const hailSound = useSound("/audio/hail.mp3", {
    volume: 0.7,
    loop: true,
  });

  const fireSound = useSound("/audio/fire.mp3", {
    volume: 0.65,
  });

  const fireLoopSound = useSound("/audio/fire-loop.mp3", {
    volume: 0.5,
    loop: true,
  });

  const treeSound = useSound("/audio/tree.mp3", {
    volume: 0.8,
  });

  const successSound = useSound("/audio/success.mp3", {
    volume: 0.7,
  });

  const previousTriggered = useRef({});
  const previousPreventions = useRef({});

  useEffect(() => {
    const previous = previousTriggered.current;

    if (triggered?.hail && !previous.hail) {
      hailSound.play();
    }

    if (!triggered?.hail && previous.hail) {
      hailSound.stop();
    }

    if (triggered?.fire && !previous.fire) {
      fireLoopSound.stop();
      fireSound.play();
    }

    if (!triggered?.fire && previous.fire) {
      fireSound.stop();
      fireLoopSound.stop();
    }

    if (
      (triggered?.tree && !previous.tree) ||
      (triggered?.fallenTree && !previous.fallenTree) ||
      (triggered?.["fallen-tree"] && !previous["fallen-tree"])
    ) {
      treeSound.play();
    }

    previousTriggered.current = { ...triggered };
  }, [triggered]);

  useEffect(() => {
    const previous = previousPreventions.current;

    const preventionWasAdded = Object.keys(preventions || {}).some(
      (id) => preventions[id] && !previous[id]
    );

    if (preventionWasAdded) {
      successSound.play();
    }

    previousPreventions.current = { ...preventions };
  }, [preventions]);

  useEffect(() => {
    const fireIntroAudio = fireSound.audio.current;
    const continueFireAmbience = () => {
      if (useGameStore.getState().triggered?.fire) {
        fireLoopSound.play();
      }
    };

    fireIntroAudio?.addEventListener("ended", continueFireAmbience);

    return () => {
      fireIntroAudio?.removeEventListener("ended", continueFireAmbience);
      hailSound.stop();
      fireSound.stop();
      fireLoopSound.stop();
      treeSound.stop();
      successSound.stop();
    };
  }, []);

  return null;
}
