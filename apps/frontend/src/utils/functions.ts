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

export const formatQuantity = (num: number | string) => {
    const value = Number(num);
    if (isNaN(value)) return "0";

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: isMobile ? 2 : 3,
    }).format(value);
};

export const formatPrice = (num: number | string) => {
    const value = Number(num);
    if (isNaN(value)) return "$0.00";

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

    let maxDecimals = 2;
    let minDecimals = 2;

    if (value < 1) {
        maxDecimals = 4;
        minDecimals = 2;
    } else if (isMobile) {
        maxDecimals = 0;
        minDecimals = 0;
    }

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: minDecimals,
        maximumFractionDigits: maxDecimals,
    }).format(value);
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