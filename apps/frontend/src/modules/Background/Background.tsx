import { useEffect, useMemo, useRef, useState } from "react";
import { useAppSelector } from "../../store";
import { scrollToSectionById } from "../../utils/functions";
import type { Theme } from "../FixedFooter/theme.slice";

const SNAP_DEBOUNCE_MS = 150;
const SNAP_LOCK_MS = 500;
const MOUSE_RADIUS = 170;
const DRIFT_FORCE = 0.012;
const MIN_SPEED = 0.08;

type Particle = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
};

export function Background() {
    const theme: Theme = useAppSelector((state) => state.theme.theme);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationRef = useRef<number | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isSnappingRef = useRef(false);
    const currentSectionIdRef = useRef<string | null>(null);
    const [scrollY, setScrollY] = useState(0);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [sectionIds, setSectionIds] = useState<string[]>([]);

    const palette = useMemo(() => {
        if (theme === "dark") {
            return {
                bgStart: "#060d1d",
                bgEnd: "#102949",
                point: "rgba(226, 236, 255, 0.92)",
                line: "rgba(166, 196, 255, 0.48)",
            };
        }

        return {
            bgStart: "#0f1b34",
            bgEnd: "#1f3f67",
            point: "rgba(216, 229, 255, 0.9)",
            line: "rgba(136, 170, 226, 0.44)",
        };
    }, [theme]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        const ids = Array.from(document.querySelectorAll('[id^="section"]')).map((el) => el.id);
        setSectionIds(ids);
    }, []);

    useEffect(() => {
        const onScroll = () => setScrollY(window.scrollY);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        if (!isMobile) {
            currentSectionIdRef.current = null;
            return;
        }

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            if (isSnappingRef.current) return;

            let closestSection: string | null = null;
            let minDistance = Infinity;

            for (const id of sectionIds) {
                const element = document.getElementById(id);
                if (!element) continue;

                const distance = Math.abs(element.offsetTop - scrollY);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestSection = id;
                }
            }

            if (!closestSection || closestSection === currentSectionIdRef.current) return;

            isSnappingRef.current = true;
            currentSectionIdRef.current = closestSection;
            scrollToSectionById(closestSection, 80, true);

            setTimeout(() => {
                isSnappingRef.current = false;
            }, SNAP_LOCK_MS);
        }, SNAP_DEBOUNCE_MS);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [scrollY, sectionIds, isMobile]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        let width = 0;
        let height = 0;
        let dpr = 1;
        const mouse = { x: -1000, y: -1000, active: false };
        let particles: Particle[] = [];

        const createParticles = (count: number) => {
            particles = Array.from({ length: count }, () => ({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.7,
                vy: (Math.random() - 0.5) * 0.7,
                size: Math.random() * 1.7 + 1,
            }));
        };

        const setupCanvas = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = window.innerWidth;
            height = window.innerHeight;

            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            context.setTransform(dpr, 0, 0, dpr, 0, 0);

            const count = Math.max(45, Math.min(120, Math.floor((width * height) / 18000)));
            createParticles(count);
        };

        const drawBackground = () => {
            const gradient = context.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, palette.bgStart);
            gradient.addColorStop(1, palette.bgEnd);

            context.fillStyle = gradient;
            context.fillRect(0, 0, width, height);
        };

        const animate = () => {
            drawBackground();

            const linkDistance = isMobile ? 95 : 130;

            for (let i = 0; i < particles.length; i += 1) {
                const particle = particles[i];

                const dx = mouse.x - particle.x;
                const dy = mouse.y - particle.y;
                const dist = Math.hypot(dx, dy);

                if (mouse.active && dist < MOUSE_RADIUS && dist > 1) {
                    const pull = (1 - dist / MOUSE_RADIUS) * 0.03;
                    particle.vx += (dx / dist) * pull;
                    particle.vy += (dy / dist) * pull;
                }

                particle.vx += (Math.random() - 0.5) * DRIFT_FORCE;
                particle.vy += (Math.random() - 0.5) * DRIFT_FORCE;

                particle.vx *= 0.985;
                particle.vy *= 0.985;

                const speed = Math.hypot(particle.vx, particle.vy);
                if (speed < MIN_SPEED) {
                    const angle = Math.random() * Math.PI * 2;
                    particle.vx += Math.cos(angle) * 0.03;
                    particle.vy += Math.sin(angle) * 0.03;
                }

                particle.vx = Math.max(Math.min(particle.vx, 1.2), -1.2);
                particle.vy = Math.max(Math.min(particle.vy, 1.2), -1.2);

                particle.x += particle.vx;
                particle.y += particle.vy;

                if (particle.x < 0 || particle.x > width) {
                    particle.vx *= -1;
                    particle.x = Math.min(Math.max(particle.x, 0), width);
                }

                if (particle.y < 0 || particle.y > height) {
                    particle.vy *= -1;
                    particle.y = Math.min(Math.max(particle.y, 0), height);
                }
            }

            for (let i = 0; i < particles.length; i += 1) {
                const a = particles[i];

                for (let j = i + 1; j < particles.length; j += 1) {
                    const b = particles[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const dist = Math.hypot(dx, dy);

                    if (dist > linkDistance) continue;

                    context.strokeStyle = palette.line;
                    context.globalAlpha = 1 - dist / linkDistance;
                    context.lineWidth = 1;
                    context.beginPath();
                    context.moveTo(a.x, a.y);
                    context.lineTo(b.x, b.y);
                    context.stroke();
                }
            }

            context.globalAlpha = 1;
            context.fillStyle = palette.point;
            for (const particle of particles) {
                context.beginPath();
                context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                context.fill();
            }

            animationRef.current = window.requestAnimationFrame(animate);
        };

        const handleResize = () => setupCanvas();

        const handleMouseMove = (event: MouseEvent) => {
            mouse.x = event.clientX;
            mouse.y = event.clientY;
            mouse.active = true;
        };

        const handleMouseLeave = () => {
            mouse.active = false;
            mouse.x = -1000;
            mouse.y = -1000;
        };

        setupCanvas();
        animationRef.current = window.requestAnimationFrame(animate);

        window.addEventListener("resize", handleResize);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseout", handleMouseLeave);

        return () => {
            if (animationRef.current !== null) {
                window.cancelAnimationFrame(animationRef.current);
            }

            window.removeEventListener("resize", handleResize);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseout", handleMouseLeave);
        };
    }, [isMobile, palette]);

    return (
        <div className="fixed top-0 left-0 w-screen h-screen z-[-1]">
            <canvas ref={canvasRef} className="w-full h-full" aria-hidden="true" />
        </div>
    );
}
