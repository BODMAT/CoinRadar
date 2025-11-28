export const textFromTopAnimation = {
    hidden: { opacity: 0, y: -80 },
    visible: (custom: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: custom * 0.2 },
    }),
};

export const blockFromLeftAnimation = {
    hidden: { opacity: 0, x: -200, scale: 1, willChange: 'transform' },
    visible: (custom: number) => ({
        scale: 1,
        opacity: 1,
        x: 0,
        transition: { delay: custom },
    }),
};

export const blockFromRightAnimation = {
    hidden: { opacity: 0, x: 200, scale: 1, },
    visible: (custom: number) => ({
        scale: 1,
        opacity: 1,
        x: 0,
        transition: { delay: custom },
    }),
};