import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { cargoSchema, addRequisitoSchema } from '../schemas/cargo.schemas';

// Extraímos os tipos dos schemas globais
type CreateCargoData = z.infer<typeof cargoSchema>['body'];
type AddRequisitoData = z.infer<typeof addRequisitoSchema>['body'];

export class CargoController {

    // Criar Cargo + Requisitos iniciais
    create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!['ADMIN', 'RH', 'ENCARREGADO'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }

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
        } catch (error) {
            next(error);
        }
    }

    list = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const cargos = await prisma.cargo.findMany({
                include: {
                    requisitos: true,
                    _count: { select: { colaboradores: true } }
                },
                orderBy: { nome: 'asc' }
            });
            res.json(cargos);
        } catch (error) {
            next(error);
        }
    }

    delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!['ADMIN', 'RH'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }

            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: "ID inválido." });
                return;
            }

            await prisma.cargo.delete({ where: { id } });
            res.json({ message: 'Cargo removido com sucesso.' });
        } catch (error) {
            next(error); // Middleware trata P2003 (FK constraint - colaboradores vinculados)
        }
    }

    // Adicionar um novo treinamento a um cargo existente
    addRequisito = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!['ADMIN', 'RH'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }

            const { id: cargoId } = req.params;
            if (!cargoId) {
                res.status(400).json({ error: "ID do cargo inválido" });
                return;
            }

            const dados = req.body as AddRequisitoData;

            // Verificar existência (O erro de FK também trataria, mas 404 é mais claro)
            const cargoExiste = await prisma.cargo.findUnique({ where: { id: cargoId } });
            if (!cargoExiste) {
                res.status(404).json({ error: "Cargo não encontrado" });
                return;
            }

            const requisito = await prisma.treinamentoObrigatorio.create({
                data: {
                    cargo: { connect: { id: cargoId } },
                    nome: dados.nome,
                    validadeMeses: dados.validadeMeses,
                    diasAntecedenciaAlerta: dados.diasAntecedenciaAlerta
                }
            });
            res.json(requisito);
        } catch (error) {
            next(error);
        }
    }

    removeRequisito = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!['ADMIN', 'RH'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }

            const { requisitoId } = req.params;
            if (!requisitoId) {
                res.status(400).json({ error: "ID do requisito inválido" });
                return;
            }

            await prisma.treinamentoObrigatorio.delete({ where: { id: requisitoId } });
            res.json({ message: 'Requisito removido.' });
        } catch (error) {
            next(error);
        }
    }
}