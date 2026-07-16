import { useEffect, useRef } from "react";
import useSound from "./useSound";
import { useGameStore } from "../store/useGameStore";
import { DISASTERS } from "../data/disasters";

function createWaterBurst(duration) {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  const context = new AudioContextClass();
  const persistent = duration == null;
  const bufferDuration = persistent ? 2 : duration;
  const frameCount = Math.ceil(context.sampleRate * bufferDuration);
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const samples = buffer.getChannelData(0);
  let seed = 1729;
  for (let index = 0; index < frameCount; index += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const noise = (seed / 4294967295) * 2 - 1;
    const progress = index / frameCount;
    const envelope = persistent
      ? 0.9 + Math.sin(progress * Math.PI * 2) * 0.06
      : Math.min(1, progress * 18) * Math.pow(1 - progress, 0.42);
    samples[index] = noise * envelope;
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  source.loop = persistent;
  filter.type = "bandpass";
  filter.frequency.value = 1450;
  filter.Q.value = 0.45;
  gain.gain.value = persistent ? 0.19 : 0.16;
  source.connect(filter).connect(gain).connect(context.destination);
  source.start();
  if (!persistent) source.stop(context.currentTime + duration);

  return {
    stop() {
      try {
        source.stop();
      } catch {
        // The one-shot already reached its authored end.
      }
      context.close().catch(() => {});
    },
  };
}

function createElectricalArc(reduced) {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  const context = new AudioContextClass();
  const duration = reduced ? 0.62 : 2.8;
  const frameCount = Math.ceil(context.sampleRate * duration);
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const samples = buffer.getChannelData(0);
  const crackles = reduced
    ? [0.04, 0.16, 0.3, 0.46]
    : [0.03, 0.14, 0.31, 0.48, 0.72, 0.96, 1.3, 1.72, 2.12, 2.46];
  let seed = 4099;

  for (let index = 0; index < frameCount; index += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const noise = (seed / 4294967295) * 2 - 1;
    const time = index / context.sampleRate;
    const crackle = crackles.reduce(
      (strength, beat) => strength + Math.exp(-Math.abs(time - beat) * 105),
      0
    );
    const attack = Math.min(1, time * 30);
    const release = Math.min(1, (duration - time) * (reduced ? 12 : 3.5));
    samples[index] = noise * Math.min(1, crackle) * attack * release;
  }

  const noiseSource = context.createBufferSource();
  const noiseFilter = context.createBiquadFilter();
  const noiseGain = context.createGain();
  const hum = context.createOscillator();
  const humGain = context.createGain();
  noiseSource.buffer = buffer;
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = 2800;
  noiseFilter.Q.value = 0.7;
  noiseGain.gain.value = reduced ? 0.14 : 0.2;
  hum.type = "sawtooth";
  hum.frequency.value = 60;
  humGain.gain.setValueAtTime(reduced ? 0.035 : 0.055, context.currentTime);
  humGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
  noiseSource.connect(noiseFilter).connect(noiseGain).connect(context.destination);
  hum.connect(humGain).connect(context.destination);
  noiseSource.start();
  hum.start();
  noiseSource.stop(context.currentTime + duration);
  hum.stop(context.currentTime + duration);

  return {
    stop() {
      try {
        noiseSource.stop();
        hum.stop();
      } catch {
        // The authored one-shot already reached its end.
      }
      context.close().catch(() => {});
    },
  };
}

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
  const waterBurst = useRef(null);
  const electricalArc = useRef(null);
  const fireLoopStarted = useRef(false);

  useEffect(() => {
    const previous = previousTriggered.current;

    if (triggered?.hail && !previous.hail) {
      hailSound.play(10);
    }

    if (!triggered?.hail && previous.hail) {
      hailSound.stop();
    }

    if (triggered?.fire && !previous.fire) {
      fireLoopStarted.current = false;
      fireLoopSound.stop();
      fireSound.play();
    }

    if (!triggered?.fire && previous.fire) {
      fireLoopStarted.current = false;
      fireSound.stop();
      fireLoopSound.stop();
    }

    if (triggered?.water && !previous.water) {
      waterBurst.current?.stop();
      waterBurst.current = createWaterBurst(
        preventions?.water
          ? DISASTERS.water.sprayDurationReduced
          : DISASTERS.water.sprayPersistsUntilReset
            ? null
            : DISASTERS.water.sprayDuration
      );
    }

    if (!triggered?.water && previous.water) {
      waterBurst.current?.stop();
      waterBurst.current = null;
    }

    if (triggered?.electrical && !previous.electrical) {
      electricalArc.current?.stop();
      electricalArc.current = createElectricalArc(!!preventions?.electrical);
    }

    if (!triggered?.electrical && previous.electrical) {
      electricalArc.current?.stop();
      electricalArc.current = null;
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
    const fireLoopAudio = fireLoopSound.audio.current;
    const continueFireAmbience = () => {
      if (
        useGameStore.getState().triggered?.fire &&
        !fireLoopStarted.current
      ) {
        fireLoopStarted.current = true;
        fireLoopSound.play();
      }
    };
    const bridgeFireSounds = () => {
      const remaining = fireIntroAudio.duration - fireIntroAudio.currentTime;
      if (Number.isFinite(remaining) && remaining <= 0.3) {
        continueFireAmbience();
      }
    };

    fireLoopAudio?.load();
    fireIntroAudio?.addEventListener("timeupdate", bridgeFireSounds);
    fireIntroAudio?.addEventListener("ended", continueFireAmbience);

    return () => {
      fireIntroAudio?.removeEventListener("timeupdate", bridgeFireSounds);
      fireIntroAudio?.removeEventListener("ended", continueFireAmbience);
      hailSound.stop();
      fireSound.stop();
      fireLoopSound.stop();
      treeSound.stop();
      successSound.stop();
      waterBurst.current?.stop();
      electricalArc.current?.stop();
    };
  }, []);

  return null;
}
