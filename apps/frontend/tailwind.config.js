const plugin = require('tailwindcss/plugin');

module.exports = {
    plugins: [
        plugin(function ({ addVariant }) {
            addVariant('dark-scoped', [
                '&:where(.dark, .dark *)',
            ]);
        }),
    ],
};