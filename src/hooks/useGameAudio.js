import { useEffect, useLayoutEffect, useRef } from "react";
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
  const persistent = !reduced;
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
  noiseSource.loop = persistent;
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = 2800;
  noiseFilter.Q.value = 0.7;
  noiseGain.gain.value = reduced ? 0.14 : 0.2;
  hum.type = "sawtooth";
  hum.frequency.value = 60;
  humGain.gain.setValueAtTime(reduced ? 0.035 : 0.055, context.currentTime);
  if (reduced) {
    humGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
  }
  noiseSource.connect(noiseFilter).connect(noiseGain).connect(context.destination);
  hum.connect(humGain).connect(context.destination);
  noiseSource.start();
  hum.start();
  if (reduced) {
    noiseSource.stop(context.currentTime + duration);
    hum.stop(context.currentTime + duration);
  }

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

function createSmokeAlarm() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "square";
  oscillator.frequency.value = 2900;
  gain.gain.value = 0;
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  context.resume().catch(() => {});

  const beep = () => {
    const start = context.currentTime;
    gain.gain.cancelScheduledValues(start);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(0.09, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
  };
  beep();
  const interval = window.setInterval(beep, 420);

  return {
    stop() {
      window.clearInterval(interval);
      try {
        oscillator.stop();
      } catch {
        // The alarm has already been stopped.
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

  const electricalFireSound = useSound("/audio/fire.mp3", {
    volume: 0.65,
  });

  const birdAmbience = useSound("/audio/birds.mp3", {
    volume: 0.32,
    loop: true,
    preload: "auto",
  });

  const treeSound = useSound("/audio/tree.mp3", {
    volume: 0.8,
  });

  const successSound = useSound("/audio/success.mp3", {
    volume: 0.7,
  });

  const previousTriggered = useRef({});
  const previousPreventions = useRef({});
  const ambienceInterrupted = useRef(false);
  const waterBurst = useRef(null);
  const electricalArc = useRef(null);
  const smokeAlarm = useRef(null);
  const smokeAlarmDemand = useRef({ fire: false, electrical: false });
  const protectedFireTimeout = useRef(null);
  const electricalSmokeAlarmTimeout = useRef(null);

  const setSmokeAlarmDemand = (source, active) => {
    smokeAlarmDemand.current[source] = active;
    const alarmRequired = Object.values(smokeAlarmDemand.current).some(Boolean);

    if (alarmRequired && !smokeAlarm.current) {
      smokeAlarm.current = createSmokeAlarm();
    } else if (!alarmRequired && smokeAlarm.current) {
      smokeAlarm.current.stop();
      smokeAlarm.current = null;
    }
  };

  // Start disaster audio before React paints the newly mounted effect so the
  // first visible impact frame and its sound land on the same authored beat.
  useLayoutEffect(() => {
    const previous = previousTriggered.current;
    const disasterActive = Object.entries(triggered || {}).some(
      ([id, active]) => active && (id !== "tree" || !preventions?.removeTree)
    );
    const disasterWasActive = ambienceInterrupted.current;

    if (disasterActive) {
      birdAmbience.stop();
    } else if (disasterWasActive) {
      birdAmbience.play();
    }

    if (triggered?.hail && !previous.hail) {
      hailSound.play(10);
    }

    if (!triggered?.hail && previous.hail) {
      hailSound.stop();
    }

    if (triggered?.fire && !previous.fire) {
      fireSound.play(DISASTERS.fire.audioStartAt);
      fireLoopSound.play(DISASTERS.fire.loopAudioStartAt);
      if (preventions?.fire) {
        const fireOutMs = DISASTERS.fire.protectedSequence.fireOut * 1000;
        setSmokeAlarmDemand("fire", true);
        window.clearTimeout(protectedFireTimeout.current);
        protectedFireTimeout.current = window.setTimeout(() => {
          const state = useGameStore.getState();
          if (!state.triggered.fire || !state.preventions.fire) return;
          fireSound.stop();
          fireLoopSound.stop();
          setSmokeAlarmDemand("fire", false);
        }, fireOutMs);
      }
    }

    if (!triggered?.fire && previous.fire) {
      window.clearTimeout(protectedFireTimeout.current);
      protectedFireTimeout.current = null;
      fireSound.stop();
      fireLoopSound.stop();
      setSmokeAlarmDemand("fire", false);
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
      if (!preventions?.electrical) {
        electricalFireSound.play();
      }
      const hasSmokeAlarm = DISASTERS.electrical.smokeAlarmPreventionIds?.some(
        (id) => preventions?.[id]
      );
      if (!preventions?.electrical && hasSmokeAlarm) {
        window.clearTimeout(electricalSmokeAlarmTimeout.current);
        electricalSmokeAlarmTimeout.current = window.setTimeout(() => {
          const state = useGameStore.getState();
          const detectorStillActive = DISASTERS.electrical.smokeAlarmPreventionIds?.some(
            (id) => state.preventions?.[id]
          );
          if (!state.triggered.electrical || state.preventions.electrical || !detectorStillActive) return;
          setSmokeAlarmDemand("electrical", true);
        }, DISASTERS.electrical.smokeAlarmDelay * 1000);
      }
    }

    if (!triggered?.electrical && previous.electrical) {
      window.clearTimeout(electricalSmokeAlarmTimeout.current);
      electricalSmokeAlarmTimeout.current = null;
      electricalArc.current?.stop();
      electricalArc.current = null;
      electricalFireSound.stop();
      setSmokeAlarmDemand("electrical", false);
    }

    if (
      (triggered?.tree && !previous.tree && !preventions?.removeTree) ||
      (triggered?.fallenTree && !previous.fallenTree) ||
      (triggered?.["fallen-tree"] && !previous["fallen-tree"])
    ) {
      treeSound.play();
    }

    ambienceInterrupted.current = disasterActive;
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
    const startCalmAmbience = () => {
      const disasterActive = Object.values(
        useGameStore.getState().triggered || {}
      ).some(Boolean);
      if (!disasterActive) birdAmbience.play();

      // The first onboarding gesture gives large clips time to load without
      // putting them on the initial page-load path or delaying a later event.
      hailSound.load();
      fireSound.load();
      fireLoopSound.load();
      electricalFireSound.load();
      treeSound.load();
      window.removeEventListener("pointerdown", startCalmAmbience);
      window.removeEventListener("keydown", startCalmAmbience);
    };

    window.addEventListener("pointerdown", startCalmAmbience);
    window.addEventListener("keydown", startCalmAmbience);
    return () => {
      window.removeEventListener("pointerdown", startCalmAmbience);
      window.removeEventListener("keydown", startCalmAmbience);
    };
  }, []);

  useEffect(() => {
    return () => {
      hailSound.stop();
      fireSound.stop();
      fireLoopSound.stop();
      electricalFireSound.stop();
      birdAmbience.stop();
      window.clearTimeout(protectedFireTimeout.current);
      window.clearTimeout(electricalSmokeAlarmTimeout.current);
      smokeAlarmDemand.current = { fire: false, electrical: false };
      smokeAlarm.current?.stop();
      treeSound.stop();
      successSound.stop();
      waterBurst.current?.stop();
      electricalArc.current?.stop();
    };
  }, []);

  return null;
}
