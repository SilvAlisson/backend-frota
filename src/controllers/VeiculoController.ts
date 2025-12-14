import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { KmService } from '../services/KmService';
import { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { veiculoSchema } from '../schemas/veiculo.schemas';

// Helper function to format date
const formatDateToInput = (date: Date | null | undefined): string | null => {
    if (!date) return null;
    const d = new Date(date);
    const dataCorrigida = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    return dataCorrigida.toISOString().split('T')[0] as string;
};

// Extração do tipo limpo
type VeiculoData = z.infer<typeof veiculoSchema>['body'];

export class VeiculoController {

    static async create(req: AuthenticatedRequest, res: Response) {
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem gerir a frota.' });
        }

        try {
            const dados = req.body as VeiculoData;

            const novoVeiculo = await prisma.veiculo.create({
                data: {
                    placa: dados.placa,
                    modelo: dados.modelo,
                    ano: dados.ano,
                    tipoCombustivel: dados.tipoCombustivel,

                    // CORREÇÃO CRÍTICA: Salvando o status
                    status: dados.status || 'ATIVO',

                    // Nullish Coalescing para opcionais
                    capacidadeTanque: dados.capacidadeTanque ?? null,
                    tipoVeiculo: dados.tipoVeiculo ?? null,
                    vencimentoCiv: dados.vencimentoCiv ?? null,
                    vencimentoCipp: dados.vencimentoCipp ?? null,
                },
            });
            res.status(201).json(novoVeiculo);
        } catch (error) {
            console.error("Erro criar veículo:", error);
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                return res.status(409).json({ error: `Veículo com esta placa já existe.` });
            }
            res.status(500).json({ error: 'Erro ao cadastrar veículo' });
        }
    }

    static async list(req: Request, res: Response) {
        try {
            const veiculos = await prisma.veiculo.findMany({
                orderBy: { placa: 'asc' }
            });
            res.status(200).json(veiculos);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar veículos' });
        }
    }

    static async getById(req: Request, res: Response) {
        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'ID inválido' });

        try {
            const veiculo = await prisma.veiculo.findUnique({ where: { id } });
            if (!veiculo) return res.status(404).json({ error: 'Veículo não encontrado.' });

            const ultimoKm = await KmService.getUltimoKMRegistrado(id);

            const veiculoFormatado = {
                ...veiculo,
                vencimentoCiv: formatDateToInput(veiculo.vencimentoCiv),
                vencimentoCipp: formatDateToInput(veiculo.vencimentoCipp),
                ultimoKm: ultimoKm
            };

            res.status(200).json(veiculoFormatado);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar dados do veículo.' });
        }
    }

    static async update(req: AuthenticatedRequest, res: Response) {
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'ID inválido' });

        try {
            const dados = req.body as VeiculoData;

            const updatedVeiculo = await prisma.veiculo.update({
                where: { id },
                data: {
                    placa: dados.placa,
                    modelo: dados.modelo,
                    ano: dados.ano,
                    tipoCombustivel: dados.tipoCombustivel,

                    // CORREÇÃO CRÍTICA: Atualizando o status
                    status: dados.status,

                    capacidadeTanque: dados.capacidadeTanque ?? null,
                    tipoVeiculo: dados.tipoVeiculo ?? null,
                    vencimentoCiv: dados.vencimentoCiv ?? null,
                    vencimentoCipp: dados.vencimentoCipp ?? null,
                },
            });
            res.status(200).json(updatedVeiculo);
        } catch (error) {
            console.error(`Erro atualizar veículo ${id}:`, error);
            res.status(500).json({ error: 'Erro ao atualizar veículo.' });
        }
    }

    static async delete(req: AuthenticatedRequest, res: Response) {
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'ID inválido' });

        try {
            await prisma.veiculo.delete({ where: { id } });
            res.status(200).json({ message: 'Veículo removido com sucesso.' });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2003' || error.code === 'P2014')) {
                return res.status(409).json({ error: 'Este veículo não pode ser removido pois possui registos associados.' });
            }
            res.status(500).json({ error: 'Erro ao remover veículo.' });
        }
    }
}