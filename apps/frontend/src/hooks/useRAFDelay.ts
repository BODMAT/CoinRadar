import { useState, useEffect } from 'react';

export function useRAFDelay(delayMs = 0): boolean {
    const [shouldAnimate, setShouldAnimate] = useState(false);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;

            if (elapsed >= delayMs) {
                setShouldAnimate(true);
            } else {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrame);
    }, [delayMs]);

    return shouldAnimate;
}