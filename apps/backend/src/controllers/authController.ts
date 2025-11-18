import type { Request, Response } from 'express';
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const z = require('zod');
const { RegisterSchema, LoginSchema, UserSchema } = require('../models/AuthSchema');
const handleZodError = require('../utils/helpers');

const JWT_SECRET = process.env.JWT_SECRET;
const saltRounds = 10;

exports.registerUser = async (req: Request, res: Response) => {
    try {
        const validatedData = RegisterSchema.parse(req.body);
        const { login, password, email } = validatedData;

        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = await prisma.user.create({
            data: {
                login,
                password: hashedPassword,
                email: email || null,
            },
            select: {
                id: true,
                login: true,
                email: true,
            }
        });

        const token = jwt.sign(
            { userId: newUser.id, userLogin: newUser.login },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        const responseData = UserSchema.parse({
            uid: newUser.id,
            login: newUser.login,
            email: newUser.email,
            token: token,
        });

        return res.status(201).json({
            message: 'User successfully registered.',
            user: responseData
        });

    } catch (error: any) {
        if (error.code === 'P2002') {
            const field = error.meta.target.includes('email') ? 'Email' : 'Login';
            return res.status(409).json({
                error: `${field} is already taken. Please choose a different ${field.toLowerCase()}.`
            });
        }

        if (error instanceof z.ZodError) {
            return handleZodError(res, error);
        }

        console.error('Registration error:', error);
        return res.status(500).json({ error: 'Server error during registration.' });
    }
};

// ====================================================================

exports.loginUser = async (req: Request, res: Response) => {

    if (!JWT_SECRET) {
        console.error('JWT_SECRET is not defined in environment variables.');
        return res.status(500).json({ error: 'Server configuration error.' });
    }

    try {
        const validatedData = LoginSchema.parse(req.body);
        const { login, password } = validatedData;

        const user = await prisma.user.findFirst({
            where: { login },
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        //! ГЕНЕРАЦІЯ ТОКЕНА
        const token = jwt.sign(
            { userId: user.id, userLogin: user.login },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        //! ФОРМАТУВАННЯ ВІДПОВІДІ
        try {
            const responseData = UserSchema.parse({
                uid: user.id,
                login: user.login,
                email: user.email,
                token: token
            });

            res.json({
                message: 'Login successful',
                user: responseData
            });

        } catch (error) {
            console.error('Response formatting error:', error);
            res.status(500).json({ error: 'Server error during response formatting.' });
        }

    } catch (error) {
        if (error instanceof z.ZodError) {
            return handleZodError(res, error);
        }

        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login.' });
    }
};

// ====================================================================