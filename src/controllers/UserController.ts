import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import { AuthenticatedRequest } from '../middleware/auth';
import { Prisma } from '@prisma/client';

export class UserController {

    static async create(req: AuthenticatedRequest, res: Response) {
        // Permitir ADMIN e RH
        if (!['ADMIN', 'RH'].includes(req.user?.role || '')) {
            return res.status(403).json({ error: 'Acesso não autorizado. Apenas Admins e RH podem criar usuários.' });
        }

        try {
            const {
                nome, email, password, matricula, role,
                // Novos campos do RH
                cargoId, cnhNumero, cnhCategoria, cnhValidade, dataAdmissao
            } = req.body;

            // Bloqueio de segurança: RH não pode criar um ADMIN, apenas outro RH ou níveis abaixo
            if (req.user?.role === 'RH' && role === 'ADMIN') {
                 return res.status(403).json({ error: 'RH não pode criar usuários Administradores.' });
            }

            if (role === 'ADMIN' && req.user?.role !== 'ADMIN') {
                 // Redundância de segurança
                 return res.status(403).json({ error: 'Apenas ADMIN pode criar outro ADMIN.' });
            }

            if (!nome || !email || !password || !role) {
                return res.status(400).json({ error: 'Nome, email, password e role são obrigatórios.' });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const novoUser = await prisma.user.create({
                data: {
                    nome,
                    email,
                    password: hashedPassword,
                    matricula: matricula || null,
                    role,
                    // Campos opcionais de RH
                    cargoId: cargoId || null,
                    cnhNumero: cnhNumero || null,
                    cnhCategoria: cnhCategoria || null,
                    cnhValidade: cnhValidade ? new Date(cnhValidade) : null,
                    dataAdmissao: dataAdmissao ? new Date(dataAdmissao) : null
                },
            });

            // Remove a senha do retorno (segurança)
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
        // ATUALIZADO: Permitir ADMIN e RH
        if (!['ADMIN', 'RH'].includes(req.user?.role || '')) return res.status(403).json({ error: 'Acesso negado.' });

        const id = req.params.id;
        if (!id) return res.status(400).json({ error: 'ID não fornecido.' });

        try {
            const user = await prisma.user.findUnique({
                where: { id },
                include: { cargo: true } 
            });

            if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

            // Remove a senha antes de enviar
            const { password, ...userSafe } = user;
            res.json(userSafe);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar usuário' });
        }
    }

    static async update(req: AuthenticatedRequest, res: Response) {
        //  Permitir ADMIN e RH
        if (!['ADMIN', 'RH'].includes(req.user?.role || '')) return res.status(403).json({ error: 'Acesso negado.' });

        const id = req.params.id;
        if (!id) return res.status(400).json({ error: 'ID não fornecido.' });

        try {
            const {
                nome, email, matricula, role, password,
                cargoId, cnhNumero, cnhCategoria, cnhValidade, dataAdmissao
            } = req.body;

            // Segurança: RH não pode promover ninguém a ADMIN nem alterar dados de um ADMIN
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
                cargoId: cargoId || null,
                cnhNumero: cnhNumero || null,
                cnhCategoria: cnhCategoria || null,
                cnhValidade: cnhValidade ? new Date(cnhValidade) : null,
                dataAdmissao: dataAdmissao ? new Date(dataAdmissao) : null
            };

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
        // Permitir ADMIN e RH
        if (!['ADMIN', 'RH'].includes(req.user?.role || '')) return res.status(403).json({ error: 'Acesso negado.' });

        const id = req.params.id;
        if (!id) return res.status(400).json({ error: 'ID não fornecido.' });

        if (req.user?.userId === id) return res.status(400).json({ error: 'Não pode remover a si mesmo.' });

        try {
            // Segurança: RH não apaga ADMIN
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