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