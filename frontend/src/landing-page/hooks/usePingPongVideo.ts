import { useEffect, useRef } from 'react';

/**
 * Plays a video forward then backward in a seamless ping-pong loop.
 * Manually drives currentTime via rAF so the browser never hard-cuts.
 */
export function usePingPongVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let direction = 1; // 1 = forward, -1 = reverse
    let lastTimestamp = 0;
    let animId: number;

    const tick = (timestamp: number) => {
      if (!video.duration || video.duration === Infinity) {
        animId = requestAnimationFrame(tick);
        return;
      }

      if (lastTimestamp === 0) {
        lastTimestamp = timestamp;
        animId = requestAnimationFrame(tick);
        return;
      }

      // Cap delta to 50ms to avoid big jumps after tab switch / throttle
      const delta = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
      lastTimestamp = timestamp;

      let next = video.currentTime + direction * delta;

      if (next >= video.duration) {
        next = video.duration;
        direction = -1;
      } else if (next <= 0) {
        next = 0;
        direction = 1;
      }

      video.currentTime = next;
      animId = requestAnimationFrame(tick);
    };

    const start = () => {
      video.pause();
      lastTimestamp = 0;
      animId = requestAnimationFrame(tick);
    };

    if (video.readyState >= 2) {
      start();
    } else {
      video.addEventListener('loadeddata', start, { once: true });
      video.load();
    }

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return videoRef;
}
