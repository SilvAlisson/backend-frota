import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import { AuthenticatedRequest } from '../middleware/auth';
import { Prisma } from '@prisma/client';

export class UserController {

    static async create(req: AuthenticatedRequest, res: Response) {
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Acesso não autorizado. Apenas Admins podem criar usuários.' });
        }
        try {
            const { nome, email, password, matricula, role } = req.body;
            if (role === 'ADMIN') {
                return res.status(403).json({ error: 'Não é permitido criar outro ADMIN por esta rota.' });
            }
            if (!nome || !email || !password || !role) {
                return res.status(400).json({ error: 'Nome, email, password e role são obrigatórios.' });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const novoUser = await prisma.user.create({
                data: { nome, email, password: hashedPassword, matricula, role },
            });

            // Remove a senha do retorno (segurança)
            const { password: _, ...userSemSenha } = novoUser;
            res.status(201).json(userSemSenha);

        } catch (error: any) {
            if (error.code === 'P2002') {
                return res.status(409).json({ error: `Já existe um usuário com este email ou matrícula.` });
            }
            res.status(500).json({ error: 'Erro ao registrar usuário' });
        }
    }

    static async list(req: Request, res: Response) {
        try {
            const users = await prisma.user.findMany({
                select: { id: true, nome: true, email: true, role: true, matricula: true },
                orderBy: { nome: 'asc' }
            });
            res.json(users);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao listar usuários' });
        }
    }

    static async getById(req: AuthenticatedRequest, res: Response) {
        if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado.' });

        const id = req.params.id; // Pega diretamente
        if (!id) return res.status(400).json({ error: 'ID não fornecido.' });

        try {
            const user = await prisma.user.findUnique({
                where: { id }, // O TypeScript agora entende que id é string devido à verificação acima
                select: { id: true, nome: true, email: true, role: true, matricula: true }
            });
            if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
            res.json(user);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar usuário' });
        }
    }

    static async update(req: AuthenticatedRequest, res: Response) {
        if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado.' });

        const id = req.params.id;
        if (!id) return res.status(400).json({ error: 'ID não fornecido.' });

        try {
            const { nome, email, matricula, role, password } = req.body;
            const data: any = { nome, email, matricula: matricula || null, role };

            if (password && password.trim() !== '') {
                const salt = await bcrypt.genSalt(10);
                data.password = await bcrypt.hash(password, 10);
            }

            const updated = await prisma.user.update({
                where: { id },
                data,
                select: { id: true, nome: true, email: true, role: true, matricula: true }
            });
            res.json(updated);
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                return res.status(409).json({ error: 'Email ou matrícula já existentes.' });
            }
            res.status(500).json({ error: 'Erro ao atualizar usuário' });
        }
    }

    static async delete(req: AuthenticatedRequest, res: Response) {
        if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado.' });

        const id = req.params.id;
        if (!id) return res.status(400).json({ error: 'ID não fornecido.' });

        if (req.user?.userId === id) return res.status(400).json({ error: 'Não pode remover a si mesmo.' });

        try {
            await prisma.user.delete({ where: { id } });
            res.json({ message: 'Usuário removido' });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2003' || error.code === 'P2014')) {
                return res.status(409).json({ error: 'Não é possível remover: Usuário possui registos vinculados.' });
            }
            res.status(500).json({ error: 'Erro ao remover usuário.' });
        }
    }
}