import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth';
import { env } from '../config/env';

export class AuthController {

    static async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;
            if (!email || !password) return res.status(400).json({ error: 'Credenciais obrigatórias.' });

            const user = await prisma.user.findUnique({ where: { email } });
            if (!user || !await bcrypt.compare(password, user.password)) {
                return res.status(401).json({ error: 'Credenciais inválidas' });
            }

            const token = jwt.sign(
                { userId: user.id, role: user.role },
                env.TOKEN_SECRET,
                { expiresIn: '30d' }
            );

            res.status(200).json({
                message: 'Login bem-sucedido',
                token,
                user: {
                    id: user.id,
                    nome: user.nome,
                    email: user.email,
                    role: user.role,
                    fotoUrl: user.fotoUrl
                },
            });
        } catch (error) {
            console.error("Erro no login:", error);
            res.status(500).json({ error: 'Erro interno' });
        }
    }

    static async loginWithToken(req: Request, res: Response) {
        try {
            const { loginToken } = req.body;
            if (!loginToken) return res.status(400).json({ error: 'Token obrigatório.' });

            const user = await prisma.user.findFirst({ where: { loginToken } });
            if (!user) return res.status(401).json({ error: 'Token inválido.' });

            const token = jwt.sign(
                { userId: user.id, role: user.role },
                env.TOKEN_SECRET,
                { expiresIn: '30d' }
            );

            res.status(200).json({
                message: 'Login por token OK',
                token,
                user: {
                    id: user.id,
                    nome: user.nome,
                    email: user.email,
                    role: user.role,
                    fotoUrl: user.fotoUrl
                },
            });
        } catch (error) {
            console.error("Erro login token:", error);
            res.status(500).json({ error: 'Erro interno.' });
        }
    }

    static async generateToken(req: AuthenticatedRequest, res: Response) {
        try {
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
                return res.status(403).json({ error: 'Acesso negado. Apenas gestores podem gerar QR Code.' });
            }

            const { id } = req.params;
            if (!id) return res.status(400).json({ error: 'ID necessário.' });

            const userToCheck = await prisma.user.findUnique({ where: { id } });
            if (!userToCheck) return res.status(404).json({ error: 'Utilizador não encontrado.' });

            if (userToCheck.role !== 'OPERADOR') {
                return res.status(400).json({ error: 'Apenas operadores podem ter token de acesso rápido.' });
            }

            const token = crypto.randomBytes(32).toString('hex');

            await prisma.user.update({
                where: { id },
                data: { loginToken: token }
            });

            res.json({ loginToken: token });
        } catch (error) {
            console.error("Erro ao gerar token:", error);
            res.status(500).json({ error: 'Erro ao gerar token.' });
        }
    }
}