import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector, type RootState } from "../../store";
import { setCurrentSectionId, setIsSnapping, setLastScrolledTime, setScrollY } from "./scroll.slice";
import { RotatingArrow } from "./RotatingArrow";
import { scrollToSectionById } from "../../utils/functions";

const SNAP_DEBOUNCE_MS = 150;
export function ScrollableBackground() {
    const scrollY = useAppSelector((state: RootState) => state.scroll.scrollY);
    const currentSectionId = useAppSelector((state: RootState) => state.scroll.currentSectionId);
    const dispatch = useAppDispatch();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 1. Відслідковуємо розміри вікна
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 2. Отримую секції
    const [sectionIds, setSectionIds] = useState<string[]>([]);
    useEffect(() => {
        const sectionElements = Array.from(document.querySelectorAll('[id^="section"]'));
        const ids = sectionElements.map(el => el.id);
        setSectionIds(ids);
    }, []);

    // 3. Відслідковую скролл і оновлюємо scrollY
    useEffect(() => {
        const onScroll = () => {
            dispatch(setScrollY(window.scrollY));
            dispatch(setLastScrolledTime(Date.now()));
        };
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, [dispatch]);

    // 4. Дебаунсю snap scrolling — запускаємо snap, якщо користувач перестав скролити > 150 мс
    const isSnappingRef = useRef(false); // оптимізація
    useEffect(() => {
        if (!isMobile) return;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            if (!isSnappingRef.current) {
                isSnappingRef.current = true;
                dispatch(setIsSnapping(true));

                let closestSection = null;
                let minDistance = Infinity;

                for (const id of sectionIds) {
                    const el = document.getElementById(id);
                    if (!el) continue;
                    const elTop = el.offsetTop;
                    const distance = Math.abs(elTop - scrollY);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestSection = id;
                    }
                }

                if (closestSection && closestSection !== currentSectionId) {
                    dispatch(setCurrentSectionId(closestSection));
                    scrollToSectionById(closestSection, 80, true);
                }

                setTimeout(() => {
                    isSnappingRef.current = false;
                    dispatch(setIsSnapping(false));
                }, 500);
            }
        }, SNAP_DEBOUNCE_MS);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [scrollY, sectionIds, currentSectionId, dispatch, isMobile]);

    return (
        <div className="fixed top-0 left-0 w-screen h-screen z-[-1] pt-20">
            <img src="./background.png" alt="background" className="w-full h-full object-cover" />
            <div className="absolute top-0 left-0 w-full h-full bg-black/50" />
            <div className="absolute top-0 left-0 w-full h-full">
                <RotatingArrow src="./arrow3.png" angle={scrollY / 2} />
                <RotatingArrow src="./arrow2.png" angle={scrollY / 1.2} />
                <RotatingArrow src="./arrow1.png" angle={scrollY * 1.2} />
                <img
                    src="./center.png"
                    alt="center item"
                    className="absolute top-1/2 left-1/2 w-[700px] h-[700px] -translate-x-1/2 -translate-y-1/2 origin-center"
                />
            </div>
        </div>
    )
}