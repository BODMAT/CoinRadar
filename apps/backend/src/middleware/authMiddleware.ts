const jwt = require('jsonwebtoken');
import type { Request, Response, NextFunction } from 'express';
import type { JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('FATAL ERROR: JWT_SECRET is not set in environment variables.');
}

exports.protect = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.header('Authorization');
    const cookieHeader = req.header('Cookie');

    const cookies = cookieHeader
        ? cookieHeader
            .split(';')
            .map((item: string) => item.trim())
            .filter(Boolean)
            .reduce((acc: Record<string, string>, pair: string) => {
                const eqIndex = pair.indexOf('=');
                if (eqIndex === -1) return acc;
                const key = pair.slice(0, eqIndex).trim();
                const value = pair.slice(eqIndex + 1).trim();
                if (key) acc[key] = decodeURIComponent(value);
                return acc;
            }, {})
        : {};

    let token: string | undefined;

    if (authHeader) {
        const [scheme, candidate] = authHeader.split(' ');
        if (scheme === 'Bearer' && candidate) {
            token = candidate;
        } else {
            return res.status(401).json({ error: 'Access denied. Token format is Bearer <token>.' });
        }
    } else if (cookies.access_token) {
        token = cookies.access_token;
    }

    if (!token) {
        return res.status(401).json({ error: 'Access denied. Authorization token is missing.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        req.userId = decoded.userId;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};
