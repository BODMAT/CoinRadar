const z = require('zod');
import type { Response } from 'express';
exports.handleZodError = (res: Response, error: any) => {
    if (error instanceof z.ZodError) {
        const fieldErrors = error.flatten().fieldErrors;
        const errorMessages = Object.values(fieldErrors);
        const allErrors = errorMessages.flat();
        const firstError = allErrors.length > 0
            ? allErrors[0]
            : 'Validation failed.';

        return res.status(400).json({
            error: firstError
        });
    }
};