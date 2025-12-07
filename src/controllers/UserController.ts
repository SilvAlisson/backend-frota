import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import { AuthenticatedRequest } from '../middleware/auth';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { registerUserSchema } from '../schemas/auth.schemas';

// Extraímos o tipo do schema de registro (agora inclui cargoId e fotoUrl)
type RegisterUserData = z.infer<typeof registerUserSchema>['body'];

export class UserController {

    static async create(req: AuthenticatedRequest, res: Response) {
        // Validação de Permissão
        if (!['ADMIN', 'RH'].includes(req.user?.role || '')) {
            return res.status(403).json({ error: 'Acesso não autorizado.' });
        }

        try {
            // req.body já validado e limpo pelo Zod
            const dados = req.body as RegisterUserData;

            // Bloqueio de segurança: RH não pode criar um ADMIN
            if (req.user?.role === 'RH' && dados.role === 'ADMIN') {
                return res.status(403).json({ error: 'RH não pode criar usuários Administradores.' });
            }

            if (dados.role === 'ADMIN' && req.user?.role !== 'ADMIN') {
                return res.status(403).json({ error: 'Apenas ADMIN pode criar outro ADMIN.' });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(dados.password, salt);

            const novoUser = await prisma.user.create({
                data: {
                    nome: dados.nome,
                    email: dados.email,
                    password: hashedPassword,
                    // Nullish coalescing (?? null) para todos os opcionais
                    matricula: dados.matricula ?? null,
                    role: dados.role || 'OPERADOR',

                    fotoUrl: dados.fotoUrl ?? null,
                    cargoId: dados.cargoId ?? null,

                    cnhNumero: dados.cnhNumero ?? null,
                    cnhCategoria: dados.cnhCategoria ?? null,

                    // Conversão de data (string -> Date) apenas se existir
                    cnhValidade: dados.cnhValidade ? new Date(dados.cnhValidade) : null,
                    dataAdmissao: dados.dataAdmissao ? new Date(dados.dataAdmissao) : null,
                },
            });

            // Remove a senha do retorno
            const { password: _, ...userSemSenha } = novoUser;
            res.status(201).json(userSemSenha);

        } catch (error: any) {
            if (error.code === 'P2002') {
                return res.status(409).json({ error: `Já existe um usuário com este email, matrícula ou token.` });
            }
            console.error("Erro ao criar usuário:", error);
            res.status(500).json({ error: 'Erro ao registrar usuário' });
        }
    }

    static async list(req: Request, res: Response) {
        try {
            const users = await prisma.user.findMany({
                select: {
                    id: true,
                    nome: true,
                    email: true,
                    role: true,
                    matricula: true,
                    fotoUrl: true,
                    cargo: { select: { nome: true } }
                },
                orderBy: { nome: 'asc' }
            });
            res.json(users);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao listar usuários' });
        }
    }

    static async getById(req: AuthenticatedRequest, res: Response) {
        if (!['ADMIN', 'RH'].includes(req.user?.role || '')) return res.status(403).json({ error: 'Acesso negado.' });

        const id = req.params.id;
        if (!id) return res.status(400).json({ error: 'ID não fornecido.' });

        try {
            const user = await prisma.user.findUnique({
                where: { id },
                include: { cargo: true }
            });

            if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

            const { password, ...userSafe } = user;
            res.json(userSafe);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar usuário' });
        }
    }

    static async update(req: AuthenticatedRequest, res: Response) {
        if (!['ADMIN', 'RH'].includes(req.user?.role || '')) return res.status(403).json({ error: 'Acesso negado.' });

        const id = req.params.id;
        if (!id) return res.status(400).json({ error: 'ID não fornecido.' });

        try {
            const {
                nome, email, matricula, role, password,
                cargoId, cnhNumero, cnhCategoria, cnhValidade, dataAdmissao, fotoUrl
            } = req.body;

            // Segurança: RH não mexe em ADMIN
            if (req.user?.role === 'RH') {
                const alvo = await prisma.user.findUnique({ where: { id }, select: { role: true } });
                if (alvo?.role === 'ADMIN') {
                    return res.status(403).json({ error: 'RH não pode alterar dados de um Administrador.' });
                }
                if (role === 'ADMIN') {
                    return res.status(403).json({ error: 'RH não pode promover usuários a Administrador.' });
                }
            }

            const data: any = {
                nome, email, role,
                matricula: matricula || null,
                fotoUrl: fotoUrl || null,
                cargoId: cargoId || null,
                cnhNumero: cnhNumero || null,
                cnhCategoria: cnhCategoria || null,
                cnhValidade: cnhValidade ? new Date(cnhValidade) : null,
                dataAdmissao: dataAdmissao ? new Date(dataAdmissao) : null
            };

            // Remove campos undefined para não sobrescrever com null se não forem enviados
            Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

            if (password && password.trim() !== '') {
                const salt = await bcrypt.genSalt(10);
                data.password = await bcrypt.hash(password, 10);
            }

            const updated = await prisma.user.update({
                where: { id },
                data,
                select: { id: true, nome: true, email: true, role: true, matricula: true, fotoUrl: true }
            });
            res.json(updated);
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                return res.status(409).json({ error: 'Email ou matrícula já existentes.' });
            }
            console.error(error);
            res.status(500).json({ error: 'Erro ao atualizar usuário' });
        }
    }

    static async delete(req: AuthenticatedRequest, res: Response) {
        if (!['ADMIN', 'RH'].includes(req.user?.role || '')) return res.status(403).json({ error: 'Acesso negado.' });

        const id = req.params.id;
        if (!id) return res.status(400).json({ error: 'ID não fornecido.' });

        if (req.user?.userId === id) return res.status(400).json({ error: 'Não pode remover a si mesmo.' });

        try {
            if (req.user?.role === 'RH') {
                const alvo = await prisma.user.findUnique({ where: { id }, select: { role: true } });
                if (alvo?.role === 'ADMIN') {
                    return res.status(403).json({ error: 'RH não pode remover um Administrador.' });
                }
            }

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