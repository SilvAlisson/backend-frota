import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { registerUserSchema } from '../schemas/auth.schemas';

// Extraímos o tipo do schema de registro
type RegisterUserData = z.infer<typeof registerUserSchema>['body'];

export class UserController {

    /**
     * Cria um novo utilizador.
     */
    create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            // 1. Validação de Permissão Básica
            const currentUserRole = req.user?.role || '';
            if (!['ADMIN', 'RH'].includes(currentUserRole)) {
                res.status(403).json({ error: 'Acesso não autorizado.' });
                return;
            }

            const dados = req.body as RegisterUserData;

            // 2. Regras de Hierarquia
            if (currentUserRole === 'RH' && dados.role === 'ADMIN') {
                res.status(403).json({ error: 'RH não pode criar usuários Administradores.' });
                return;
            }
            if (dados.role === 'ADMIN' && currentUserRole !== 'ADMIN') {
                res.status(403).json({ error: 'Apenas ADMIN pode criar outro ADMIN.' });
                return;
            }

            // 3. Hash da Senha
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(dados.password, salt);

            // 4. Criação no Banco
            const novoUser = await prisma.user.create({
                data: {
                    nome: dados.nome,
                    email: dados.email,
                    password: hashedPassword,
                    role: dados.role || 'OPERADOR',
                    matricula: dados.matricula ?? null,
                    fotoUrl: dados.fotoUrl ?? null,
                    cargoId: dados.cargoId ?? null,
                    cnhNumero: dados.cnhNumero ?? null,
                    cnhCategoria: dados.cnhCategoria ?? null,
                    cnhValidade: dados.cnhValidade ? new Date(dados.cnhValidade) : null,
                    dataAdmissao: dados.dataAdmissao ? new Date(dados.dataAdmissao) : null,
                },
            });

            // 5. Retorno Seguro (Sem senha)
            const { password: _, ...userSemSenha } = novoUser;
            res.status(201).json(userSemSenha);

        } catch (error) {
            next(error);
        }
    }

    list = async (req: Request, res: Response, next: NextFunction) => {
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
            next(error);
        }
    }

    getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!['ADMIN', 'RH'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }

            const { id } = req.params;

            // CORREÇÃO: Verificação explícita para o TypeScript
            if (!id) {
                res.status(400).json({ error: 'ID não fornecido.' });
                return;
            }

            const user = await prisma.user.findUnique({
                where: { id }, // Agora 'id' é garantidamente string
                include: { cargo: true }
            });

            if (!user) {
                res.status(404).json({ error: 'Usuário não encontrado' });
                return;
            }

            const { password, ...userSafe } = user;
            res.json(userSafe);
        } catch (error) {
            next(error);
        }
    }

    update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const currentUserRole = req.user?.role || '';
            if (!['ADMIN', 'RH'].includes(currentUserRole)) {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }

            const { id } = req.params;

            // CORREÇÃO: Verificação explícita
            if (!id) {
                res.status(400).json({ error: 'ID não fornecido.' });
                return;
            }

            const {
                nome, email, matricula, role, password,
                cargoId, cnhNumero, cnhCategoria, cnhValidade, dataAdmissao, fotoUrl
            } = req.body;

            // Segurança: RH vs ADMIN
            if (currentUserRole === 'RH') {
                const alvo = await prisma.user.findUnique({ where: { id }, select: { role: true } });

                if (alvo?.role === 'ADMIN') {
                    res.status(403).json({ error: 'RH não pode alterar dados de um Administrador.' });
                    return;
                }
                if (role === 'ADMIN') {
                    res.status(403).json({ error: 'RH não pode promover usuários a Administrador.' });
                    return;
                }
            }

            // Preparar objeto de update
            const dataToUpdate: any = {
                nome,
                email,
                role,
                matricula: matricula || null,
                fotoUrl: fotoUrl || null,
                cargoId: cargoId || null,
                cnhNumero: cnhNumero || null,
                cnhCategoria: cnhCategoria || null,
                cnhValidade: cnhValidade ? new Date(cnhValidade) : null,
                dataAdmissao: dataAdmissao ? new Date(dataAdmissao) : null
            };

            Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key]);

            if (password && password.trim() !== '') {
                dataToUpdate.password = await bcrypt.hash(password, 10);
            }

            const updated = await prisma.user.update({
                where: { id },
                data: dataToUpdate,
                select: { id: true, nome: true, email: true, role: true, matricula: true, fotoUrl: true }
            });

            res.json(updated);
        } catch (error) {
            next(error);
        }
    }

    delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const currentUserRole = req.user?.role || '';
            if (!['ADMIN', 'RH'].includes(currentUserRole)) {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }

            const { id } = req.params;

            // CORREÇÃO: Verificação explícita
            if (!id) {
                res.status(400).json({ error: 'ID não fornecido.' });
                return;
            }

            if (req.user?.userId === id) {
                res.status(400).json({ error: 'Não pode remover a si mesmo.' });
                return;
            }

            if (currentUserRole === 'RH') {
                const alvo = await prisma.user.findUnique({ where: { id }, select: { role: true } });
                if (alvo?.role === 'ADMIN') {
                    res.status(403).json({ error: 'RH não pode remover um Administrador.' });
                    return;
                }
            }

            await prisma.user.delete({ where: { id } });
            res.json({ message: 'Usuário removido com sucesso' });
        } catch (error) {
            next(error);
        }
    }
}