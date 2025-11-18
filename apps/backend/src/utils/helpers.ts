const z = require('zod');
import type { Response } from 'express';
exports.handleZodError = (res: Response, error: any) => {
    if (error instanceof z.ZodError) {
        return res.status(400).json({
            error: 'Validation failed.',
            details: error.errors
        });
    }
};