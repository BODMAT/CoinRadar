export const scrollToSectionById = (
    id: string,
    offset: number = 80,
    onlyMobile: boolean = false
) => {
    if (onlyMobile && window.innerWidth >= 768) return;

    const el = document.getElementById(id);
    if (!el) return;

    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
};

export const formatQuantity = (num: number | string): string => {
    const value = Number(num);
    if (isNaN(value) || value === 0) return "0";

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

    const maxFrac = isMobile ? 2 : 3;

    const THRESHOLD = Math.pow(10, -maxFrac);

    const absValue = Math.abs(value);

    if (absValue > 0 && absValue < THRESHOLD) {
        const boundary = THRESHOLD.toFixed(maxFrac);
        return `< ${boundary}`;
    }

    if (absValue >= 1000) {
        return new Intl.NumberFormat('en-US', {
            notation: 'compact',
            maximumFractionDigits: maxFrac,
            minimumFractionDigits: 0,
        }).format(value);
    }

    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: maxFrac,
        minimumFractionDigits: 0,
    }).format(value);
};

export const formatPrice = (num: number | string) => {
    const value = Number(num);
    if (isNaN(value)) return "$0.00";

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const absValue = Math.abs(value);

    if (absValue >= 1000) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
            maximumFractionDigits: isMobile ? 1 : 2,
        }).format(value);
    }

    else if (absValue < 1) {
        let maxDecimals = 4;
        let minDecimals = 2;

        if (absValue > 0 && absValue < 0.001) {
            const stringValue = absValue.toFixed(18);
            const leadingZeros = stringValue.match(/\.0+/)?.[0].length || 0;
            maxDecimals = Math.min(18, leadingZeros + 2);
        }

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: minDecimals,
            maximumFractionDigits: maxDecimals,
        }).format(value);
    }

    else {
        let maxDecimals = 2;
        let minDecimals = 2;

        if (isMobile) {
            maxDecimals = 0;
            minDecimals = 0;
        }

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: minDecimals,
            maximumFractionDigits: maxDecimals,
        }).format(value);
    }
};

export const getLocalDatetime = (dateInput?: string | Date): string => {
    let date: Date;
    if (dateInput === undefined) {
        date = new Date();
    } else if (typeof dateInput === 'string') {
        date = new Date(dateInput);
    } else {
        date = dateInput;
    }

    if (isNaN(date.getTime())) {
        console.error("Помилка: Недійсний вхідний параметр дати.");
        return '';
    }
    const pad = (num: number): string => String(num).padStart(2, '0');

    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());

    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};