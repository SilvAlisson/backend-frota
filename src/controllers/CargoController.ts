import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';

// --- Schemas Locais ---

const requisitoSchema = z.object({
    nome: z.string({ error: "Nome do treinamento é obrigatório" }).min(2, "Nome muito curto"),
    validadeMeses: z.coerce.number({ error: "Validade deve ser número" }).int().min(0),
    diasAntecedenciaAlerta: z.coerce.number().int().default(30)
});

const createCargoSchema = z.object({
    nome: z.string({ error: "Nome é obrigatório" }).min(3, "Nome do cargo deve ter no mínimo 3 caracteres"),
    descricao: z.string().optional().nullable(),
    requisitos: z.array(requisitoSchema).optional()
});

const paramsIdSchema = z.object({
    id: z.string().min(1, "ID inválido")
});

const paramsRequisitoIdSchema = z.object({
    requisitoId: z.string().min(1, "ID do requisito inválido")
});

// -----------------------------------------------------------

export class CargoController {

    // Criar Cargo + Requisitos iniciais
    static async create(req: AuthenticatedRequest, res: Response) {
        if (!['ADMIN', 'RH', 'ENCARREGADO'].includes(req.user?.role || '')) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        const validation = createCargoSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: validation.error.flatten().fieldErrors
            });
        }

        const { nome, descricao, requisitos } = validation.data;

        try {
            const cargo = await prisma.cargo.create({
                data: {
                    nome,
                    descricao: descricao || null,
                    ...(requisitos && requisitos.length > 0 ? {
                        requisitos: {
                            create: requisitos
                        }
                    } : {})
                },
                include: { requisitos: true }
            });

            res.status(201).json(cargo);
        } catch (e: any) {
            if (e.code === 'P2002') {
                return res.status(409).json({ error: 'Já existe um cargo com este nome.' });
            }
            console.error("Erro ao criar cargo:", e);
            res.status(500).json({ error: 'Erro ao criar cargo.' });
        }
    }

    static async list(req: AuthenticatedRequest, res: Response) {
        try {
            const cargos = await prisma.cargo.findMany({
                include: {
                    requisitos: true,
                    _count: { select: { colaboradores: true } }
                },
                orderBy: { nome: 'asc' }
            });
            res.json(cargos);
        } catch (e) {
            res.status(500).json({ error: 'Erro ao listar cargos.' });
        }
    }

    static async delete(req: AuthenticatedRequest, res: Response) {
        if (!['ADMIN', 'RH'].includes(req.user?.role || '')) {
            return res.status(403).json({ error: 'Apenas RH/Admin podem deletar cargos.' });
        }

        const paramsCheck = paramsIdSchema.safeParse(req.params);
        if (!paramsCheck.success) return res.status(400).json({ error: "ID inválido." });

        const { id } = paramsCheck.data;

        try {
            await prisma.cargo.delete({ where: { id } });
            res.json({ message: 'Cargo removido com sucesso.' });
        } catch (e: any) {
            if (e.code === 'P2003') {
                return res.status(400).json({ error: 'Não é possível remover cargo com colaboradores vinculados.' });
            }
            res.status(500).json({ error: 'Erro ao remover cargo.' });
        }
    }

    // Adicionar um novo treinamento a um cargo existente
    static async addRequisito(req: AuthenticatedRequest, res: Response) {
        if (!['ADMIN', 'RH'].includes(req.user?.role || '')) return res.sendStatus(403);

        const paramsCheck = paramsIdSchema.safeParse(req.params);
        if (!paramsCheck.success) return res.status(400).json({ error: "ID do cargo inválido" });
        const { id: cargoId } = paramsCheck.data;

        const bodyCheck = requisitoSchema.safeParse(req.body);
        if (!bodyCheck.success) {
            return res.status(400).json({
                error: 'Dados do requisito inválidos',
                details: bodyCheck.error.flatten().fieldErrors
            });
        }

        const dados = bodyCheck.data;

        try {
            const cargoExiste = await prisma.cargo.findUnique({ where: { id: cargoId } });
            if (!cargoExiste) return res.status(404).json({ error: "Cargo não encontrado" });

            const requisito = await prisma.treinamentoObrigatorio.create({
                data: {
                    cargo: {
                        connect: { id: cargoId }
                    },
                    nome: dados.nome,
                    validadeMeses: dados.validadeMeses,
                    diasAntecedenciaAlerta: dados.diasAntecedenciaAlerta
                }
            });
            res.json(requisito);
        } catch (e: any) {
            console.error(e);
            res.status(500).json({ error: 'Erro ao adicionar requisito.' });
        }
    }

    static async removeRequisito(req: AuthenticatedRequest, res: Response) {
        if (!['ADMIN', 'RH'].includes(req.user?.role || '')) return res.sendStatus(403);

        const paramsCheck = paramsRequisitoIdSchema.safeParse(req.params);
        if (!paramsCheck.success) return res.status(400).json({ error: "ID do requisito inválido" });

        const { requisitoId } = paramsCheck.data;

        try {
            await prisma.treinamentoObrigatorio.delete({ where: { id: requisitoId } });
            res.json({ message: 'Requisito removido.' });
        } catch (e: any) {
            if (e.code === 'P2025') {
                return res.status(404).json({ error: 'Requisito não encontrado.' });
            }
            res.status(500).json({ error: 'Erro ao remover requisito.' });
        }
    }
}