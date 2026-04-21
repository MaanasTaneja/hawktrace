import { useState, useEffect } from 'react';

interface UseTypewriterOptions {
  text: string;
  speed?: number;
  delay?: number;
  onComplete?: () => void;
}

export function useTypewriter({ text, speed = 55, delay = 0, onComplete }: UseTypewriterOptions) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayText('');
    setIsComplete(false);

    let charIndex = 0;
    let intervalId: ReturnType<typeof setInterval>;

    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        charIndex++;
        setDisplayText(text.slice(0, charIndex));
        if (charIndex >= text.length) {
          clearInterval(intervalId);
          setIsComplete(true);
          onComplete?.();
        }
      }, speed);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
    // onComplete intentionally excluded to avoid re-triggering on re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed, delay]);

  return { displayText, isComplete };
}
