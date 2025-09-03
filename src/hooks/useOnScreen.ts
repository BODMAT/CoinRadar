import { useEffect, useRef, useState } from "react";

export function useOnScreen<T extends Element>(
    rootMargin = "0px"
): [React.RefObject<T | null>, boolean] {
    const ref = useRef<T | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!ref.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin }
        );

        observer.observe(ref.current);

        return () => observer.disconnect();
    }, [ref, rootMargin]);

    return [ref, isVisible];
}
