import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../store";
import { setScrollY } from "./scroll.slice";

export function Background() {
    const dispatch = useDispatch();
    const scrollY = useSelector((state: RootState) => state.scroll.scrollY);
    useEffect(() => {
        const onScroll = () => dispatch(setScrollY(window.scrollY));
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, [dispatch]);
    return (
        <div className="fixed top-0 left-0 w-screen h-screen z-[-1] pt-[80px]">
            <img src="./background.png" alt="background" className="w-full h-full object-cover" />
            <div className="absolute top-0 left-0 w-full h-full bg-black/30" />
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

export function RotatingArrow({ src, angle }: { src: string; angle: number }) {
    return (
        <img
            src={src}
            alt="arrow"
            className="absolute top-1/2 left-1/2"
            style={{
                width: 600,
                height: 600,
                transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                transformOrigin: 'center center',
            }}
        />
    );
}
