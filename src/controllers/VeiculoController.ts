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
    const dataCorrigida = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const result = dataCorrigida.toISOString().split('T')[0];
    return result || null;
};

// Extração do tipo do Zod + kmAtual que não está no schema do banco, mas vem no body
type VeiculoData = z.infer<typeof veiculoSchema>['body'] & { kmAtual?: number };

export class VeiculoController {

    /**
     * BUSCA DETALHES CONSOLIDADOS (Prontuário do Veículo)
     * Retorna dados cadastrais, métricas de custo e históricos recentes.
     */
    getDetalhes = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            if (!id) return res.status(400).json({ error: 'ID do veículo é obrigatório.' });

            const veiculo = await prisma.veiculo.findUnique({
                where: { id: id as string },
                include: {
                    jornadas: { orderBy: { dataInicio: 'desc' }, take: 5, include: { operador: { select: { nome: true } } } },
                    abastecimentos: { orderBy: { dataHora: 'desc' }, take: 5, include: { fornecedor: { select: { nome: true } } } },
                    // Mantenha o nome que estiver no seu schema.prisma (manutencoes ou ordensServico)
                    // Se der erro, verifique o seu model 'Veiculo' no prisma.schema
                    ordensServico: { orderBy: { data: 'desc' }, take: 5, include: { fornecedor: { select: { nome: true } } } },
                    planosManutencao: true
                }
            });

            if (!veiculo) return res.status(404).json({ error: 'Veículo não encontrado.' });

            const [manutencaoTotal, abastecimentoTotal] = await Promise.all([
                prisma.ordemServico.aggregate({ _sum: { custoTotal: true }, where: { veiculoId: id } }),
                prisma.itemAbastecimento.aggregate({
                    _sum: { valorTotal: true, quantidade: true },
                    where: { abastecimento: { veiculoId: id }, produto: { tipo: 'COMBUSTIVEL' } }
                })
            ]);

            const inicioMes = new Date();
            inicioMes.setDate(1);
            inicioMes.setHours(0, 0, 0, 0);

            const jornadasMes = await prisma.jornada.findMany({
                where: { veiculoId: id, dataInicio: { gte: inicioMes }, kmFim: { not: null } },
                select: { kmInicio: true, kmFim: true }
            });

            const kmRodadoMes = jornadasMes.reduce((acc, j) => acc + ((j.kmFim ?? 0) - j.kmInicio), 0);
            const litrosTotal = Number(abastecimentoTotal._sum.quantidade || 0);

            res.json({
                ...veiculo,
                resumoFinanceiro: {
                    totalGastoManutencao: Number(manutencaoTotal._sum.custoTotal || 0),
                    totalGastoCombustivel: Number(abastecimentoTotal._sum.valorTotal || 0),
                    mediaConsumoGeral: litrosTotal > 0 ? (kmRodadoMes / litrosTotal) : 0,
                    kmRodadoMesAtual: kmRodadoMes
                }
            });
        } catch (error) { next(error); }
    }

    /**
     * Cria um novo veículo e inicializa o histórico de KM via Transação.
     */
    create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }

            const dados = req.body as VeiculoData;
            const kmInicial = Number(dados.kmAtual);

            if (isNaN(kmInicial) || kmInicial < 0) {
                res.status(400).json({ error: 'É obrigatório informar o KM Atual válido.' });
                return;
            }

            const resultado = await prisma.$transaction(async (tx) => {
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
                        vencimentoCiv: dados.vencimentoCiv ? new Date(dados.vencimentoCiv) : null,
                        vencimentoCipp: dados.vencimentoCipp ? new Date(dados.vencimentoCipp) : null,
                        ultimoKm: kmInicial
                    },
                });

                await tx.historicoKm.create({
                    data: {
                        veiculoId: novoVeiculo.id,
                        km: kmInicial,
                        dataLeitura: new Date(),
                        origem: 'MANUAL',
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

    getById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'ID inválido' });
                return;
            }

            const veiculo = await prisma.veiculo.findUnique({ where: { id: id as string } });
            if (!veiculo) {
                res.status(404).json({ error: 'Veículo não encontrado.' });
                return;
            }

            const ultimoKm = await KmService.getUltimoKMRegistrado(id as string);

            const veiculoFormatado = {
                ...veiculo,
                kmAtual: ultimoKm,
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
                where: { id: id as string },
                data: {
                    placa: dados.placa,
                    marca: dados.marca,
                    modelo: dados.modelo,
                    ano: dados.ano,
                    tipoCombustivel: dados.tipoCombustivel,
                    status: dados.status,
                    capacidadeTanque: dados.capacidadeTanque ?? null,
                    tipoVeiculo: dados.tipoVeiculo ?? null,
                    vencimentoCiv: dados.vencimentoCiv ? new Date(dados.vencimentoCiv) : null,
                    vencimentoCipp: dados.vencimentoCipp ? new Date(dados.vencimentoCipp) : null,
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

            await prisma.veiculo.delete({ where: { id: id as string } });
            res.status(200).json({ message: 'Veículo removido com sucesso.' });
        } catch (error) {
            next(error);
        }
    }
}