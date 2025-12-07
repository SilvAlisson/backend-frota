import { Response, Request } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { cargoSchema, addRequisitoSchema } from '../schemas/cargo.schemas';
import { Prisma } from '@prisma/client'; // Importar Prisma para tratar erros

// Extraímos os tipos dos schemas globais
type CreateCargoData = z.infer<typeof cargoSchema>['body'];
type AddRequisitoData = z.infer<typeof addRequisitoSchema>['body'];

export class CargoController {

    // Criar Cargo + Requisitos iniciais
    static async create(req: AuthenticatedRequest, res: Response) {
        if (!['ADMIN', 'RH', 'ENCARREGADO'].includes(req.user?.role || '')) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        try {
            const { nome, descricao, requisitos } = req.body as CreateCargoData;

            const cargo = await prisma.cargo.create({
                data: {
                    nome,
                    descricao: descricao ?? null,

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
            // Tratamento de erro do Prisma (P2002 = Unique Constraint)
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
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
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        const { id } = req.params;
        if (!id) return res.status(400).json({ error: "ID inválido." });

        try {
            await prisma.cargo.delete({ where: { id } });
            res.json({ message: 'Cargo removido com sucesso.' });
        } catch (e: any) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
                return res.status(409).json({ error: 'Não é possível remover cargo com colaboradores vinculados.' });
            }
            res.status(500).json({ error: 'Erro ao remover cargo.' });
        }
    }

    // Adicionar um novo treinamento a um cargo existente
    static async addRequisito(req: AuthenticatedRequest, res: Response) {
        if (!['ADMIN', 'RH'].includes(req.user?.role || '')) return res.sendStatus(403);

        const { id: cargoId } = req.params;
        if (!cargoId) return res.status(400).json({ error: "ID do cargo inválido" });

        try {
            const dados = req.body as AddRequisitoData;

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

        const { requisitoId } = req.params;
        if (!requisitoId) return res.status(400).json({ error: "ID do requisito inválido" });

        try {
            await prisma.treinamentoObrigatorio.delete({ where: { id: requisitoId } });
            res.json({ message: 'Requisito removido.' });
        } catch (e: any) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
                return res.status(404).json({ error: 'Requisito não encontrado.' });
            }
            res.status(500).json({ error: 'Erro ao remover requisito.' });
        }
    }
}