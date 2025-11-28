import { Request } from 'express';

// Розширюю стандартний інтерфейс Request додавши поле user з middleware
declare module 'express' {
    export interface Request {
        userId?: string;
    }
}