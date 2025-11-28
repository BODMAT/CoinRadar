const plugin = require('tailwindcss/plugin');

module.exports = {
    // ...
    plugins: [
        plugin(function ({ addVariant }) {
            // Додавання варіанта, який застосовується, коли клас 'dark' знаходиться десь вище у DOM
            addVariant('dark-scoped', [
                '&:where(.dark, .dark *)', // Селектор, який ви хотіли
            ]);
        }),
    ],
};