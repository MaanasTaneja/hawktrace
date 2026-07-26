import { useScroll } from 'framer-motion';
import { RefObject } from 'react';

export function useScrollAnimation(
  ref: RefObject<HTMLElement>,
  offset: [string, string] = ['start start', 'end end']
) {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset,
  });

  return { scrollYProgress };
}
