export const smoothEase = [0.16, 1, 0.3, 1];

export const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
};

export const fadeInUpVariant = fadeInUp;

export const fadeInLeft = {
    hidden: { opacity: 0, x: -40 },
    visible: { opacity: 1, x: 0 },
};

export const fadeInRight = {
    hidden: { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0 },
};

export const staggerContainer = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.08,
        },
    },
};

export const motionViewport = { once: true, amount: 0.18 };

export const motionTransition = {
    duration: 0.72,
    ease: smoothEase,
};

export const cardHover = {
    y: -4,
    transition: { duration: 0.55, ease: smoothEase },
};

export const cardHoverVariant = cardHover;

export const actionRevealVariant = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
};

export const imageHoverVariant = {
    rest: { scale: 1 },
    hover: { scale: 1.04 },
};
