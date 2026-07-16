import { useEffect, useRef } from "react";
import useSound from "../useSound";
import { useGameStore } from "../store/useGameStore";

export default function useGameAudio() {
  const phase = useGameStore((state) => state.phase);
  const activeDisaster = useGameStore(
    (state) => state.activeDisaster
  );
  const panelDisaster = useGameStore(
    (state) => state.panelDisaster
  );
  const preventions = useGameStore(
    (state) => state.preventions
  );

  const hailSound = useSound("/audio/hail.mp3", {
    volume: 0.7,
  });

  const fireSound = useSound("/audio/fire.mp3", {
    volume: 0.65,
  });

  const treeSound = useSound("/audio/tree-crash.mp3", {
    volume: 0.8,
  });

  const successSound = useSound("/audio/success.mp3", {
    volume: 0.7,
  });

  const previousPhaseRef = useRef(phase);

  useEffect(() => {
    if (phase !== "active" || !activeDisaster) {
      return;
    }

    if (activeDisaster === "hail") {
      hailSound.play();
    }

    if (activeDisaster === "fire") {
      fireSound.play();
    }

    if (
      activeDisaster === "tree" ||
      activeDisaster === "fallenTree" ||
      activeDisaster === "fallen-tree"
    ) {
      treeSound.play();
    }
  }, [phase, activeDisaster]);

  useEffect(() => {
    const previousPhase = previousPhaseRef.current;

    const justEnteredAftermath =
      previousPhase === "active" &&
      phase === "aftermath";

    if (
      justEnteredAftermath &&
      panelDisaster &&
      preventions[panelDisaster]
    ) {
      successSound.play();
    }

    previousPhaseRef.current = phase;
  }, [phase, panelDisaster, preventions]);

  useEffect(() => {
    if (phase === "idle") {
      hailSound.stop();
      fireSound.stop();
      treeSound.stop();
    }
  }, [phase]);

  return null;
}