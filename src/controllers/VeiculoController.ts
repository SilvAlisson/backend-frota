import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { KmService } from '../services/KmService';
import { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { veiculoSchema } from '../schemas/veiculo.schemas';

// Helper para formatar data para o input HTML (YYYY-MM-DD)
const formatDateToInput = (date: Date | null | undefined): string | null => {
    if (!date) return null;
    const d = new Date(date);
    // Garante que não haja perda de dia por fuso horário ao extrair Y-M-D
    const dataCorrigida = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    return dataCorrigida.toISOString().split('T')[0] as string;
};

// Extração do tipo do Zod + kmAtual que não está no schema do banco, mas vem no body
type VeiculoData = z.infer<typeof veiculoSchema>['body'] & { kmAtual?: number };

export class VeiculoController {

    /**
     * Cria um novo veículo.
     * Agora inclui 'marca' e inicializa 'kmAtual' no Histórico via Transação.
     */
    create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({ error: 'Acesso negado. Apenas administradores podem gerir a frota.' });
                return;
            }

            const dados = req.body as VeiculoData;

            // Validação do Marco Zero (Obrigatório para o sistema funcionar corretamente)
            const kmInicial = Number(dados.kmAtual);
            if (isNaN(kmInicial) || kmInicial < 0) {
                res.status(400).json({ error: 'É obrigatório informar o KM Atual (Odômetro) para iniciar o histórico do veículo.' });
                return;
            }

            // Transação: Cria o Veículo E o Histórico Inicial juntos
            const resultado = await prisma.$transaction(async (tx) => {
                // 1. Cria o Veículo
                const novoVeiculo = await tx.veiculo.create({
                    data: {
                        placa: dados.placa,
                        marca: dados.marca,
                        modelo: dados.modelo,
                        ano: dados.ano,
                        tipoCombustivel: dados.tipoCombustivel,
                        status: dados.status || 'ATIVO',
                        capacidadeTanque: dados.capacidadeTanque ?? null,
                        tipoVeiculo: dados.tipoVeiculo ?? null,
                        vencimentoCiv: dados.vencimentoCiv ?? null,
                        vencimentoCipp: dados.vencimentoCipp ?? null,
                    },
                });

                // 2. Cria o Marco Zero no Histórico
                await tx.historicoKm.create({
                    data: {
                        veiculoId: novoVeiculo.id,
                        km: kmInicial,
                        dataLeitura: new Date(),
                        origem: 'MANUAL', // Indica cadastro inicial
                        origemId: null
                    }
                });

                return novoVeiculo;
            });

            res.status(201).json(resultado);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Lista veículos para a tabela.
     * O Prisma retorna as datas (vencimento) como ISO Strings, o que é perfeito para o Frontend.
     */
    list = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const veiculos = await prisma.veiculo.findMany({
                orderBy: { placa: 'asc' }
            });
            res.status(200).json(veiculos);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Busca veículo para Edição.
     * Formata as datas para YYYY-MM-DD para preencher os inputs date corretamente.
     */
    getById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'ID inválido' });
                return;
            }

            const veiculo = await prisma.veiculo.findUnique({ where: { id } });
            if (!veiculo) {
                res.status(404).json({ error: 'Veículo não encontrado.' });
                return;
            }

            // Busca o KM real (pode ser redundante se confiarmos no kmAtual da tabela, mas é mais seguro)
            const ultimoKm = await KmService.getUltimoKMRegistrado(id);

            const veiculoFormatado = {
                ...veiculo,
                kmAtual: ultimoKm, // Garante que o frontend receba o KM mais atualizado possível
                vencimentoCiv: formatDateToInput(veiculo.vencimentoCiv),
                vencimentoCipp: formatDateToInput(veiculo.vencimentoCipp),
            };

            res.status(200).json(veiculoFormatado);
        } catch (error) {
            next(error);
        }
    }

    update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }

            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'ID inválido' });
                return;
            }

            const dados = req.body as VeiculoData;

            const updatedVeiculo = await prisma.veiculo.update({
                where: { id },
                data: {
                    placa: dados.placa,
                    marca: dados.marca,
                    modelo: dados.modelo,
                    ano: dados.ano,
                    tipoCombustivel: dados.tipoCombustivel,
                    status: dados.status,
                    capacidadeTanque: dados.capacidadeTanque ?? null,
                    tipoVeiculo: dados.tipoVeiculo ?? null,
                    vencimentoCiv: dados.vencimentoCiv ?? null,
                    vencimentoCipp: dados.vencimentoCipp ?? null,
                    // Nota: Não atualizamos kmAtual aqui diretamente para evitar inconsistência com o histórico.
                    // O KM deve ser atualizado via Abastecimento ou Jornada.
                },
            });
            res.status(200).json(updatedVeiculo);
        } catch (error) {
            next(error);
        }
    }

    delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }

            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'ID inválido' });
                return;
            }

            await prisma.veiculo.delete({ where: { id } });
            res.status(200).json({ message: 'Veículo removido com sucesso.' });
        } catch (error) {
            next(error);
        }
    }
}