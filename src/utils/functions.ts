export const scrollToSectionById = (id: string, offset: number = 80) => {
    const el = document.getElementById(id);
    if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: "smooth" });
    }
};