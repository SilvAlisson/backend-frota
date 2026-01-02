import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { KmService } from '../services/KmService';
import { PrevisaoService } from '../services/PrevisaoService';
import { AuthenticatedRequest } from '../middleware/auth';
import { addDays } from '../utils/dateUtils';
import { z } from 'zod';
import { relatorioQuerySchema } from '../schemas/relatorio.schemas';

// Extraímos a tipagem do schema (Query Params)
type RelatorioQuery = z.infer<typeof relatorioQuerySchema>['query'];

export class RelatorioController {

    /**
     * EVOLUÇÃO DE KM (Para Gráficos)
     * Busca a progressão do odômetro do veículo nos últimos X dias.
     */
    getEvolucaoKm = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { veiculoId, dias } = req.query;
            const diasNum = Number(dias) || 7;

            if (!veiculoId) {
                return res.status(400).json({ error: 'ID do veículo é obrigatório.' });
            }

            const dataLimite = new Date();
            dataLimite.setDate(dataLimite.getDate() - diasNum);

            // 1. Busca o histórico no período solicitado
            const historico = await prisma.historicoKm.findMany({
                where: {
                    veiculoId: veiculoId as string,
                    dataLeitura: { gte: dataLimite }
                },
                orderBy: { dataLeitura: 'asc' }
            });

            // 2. INTELIGÊNCIA: Se não houver dados nos últimos dias, buscamos a última leitura disponível
            // para que o gráfico não fique totalmente vazio e o sistema tenha uma referência.
            if (historico.length === 0) {
                const ultimaLeitura = await prisma.historicoKm.findFirst({
                    where: { veiculoId: veiculoId as string },
                    orderBy: { dataLeitura: 'desc' }
                });

                if (ultimaLeitura) {
                    return res.json([{
                        data: new Date(ultimaLeitura.dataLeitura).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                        km: ultimaLeitura.km
                    }]);
                }
                return res.json([]);
            }

            // 3. Agrupamento: pega o maior KM registrado em cada dia
            const dadosAgrupados = historico.reduce((acc: Record<string, number>, curr) => {
                const dataLabel = new Date(curr.dataLeitura).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

                if (!acc[dataLabel] || curr.km > acc[dataLabel]) {
                    acc[dataLabel] = curr.km;
                }
                return acc;
            }, {});

            const dadosFormatados = Object.keys(dadosAgrupados).map(data => ({
                data,
                km: dadosAgrupados[data]
            }));

            res.json(dadosFormatados);
        } catch (error) {
            console.error("Erro em getEvolucaoKm:", error);
            next(error);
        }
    }

    /**
     * SUMÁRIO EXECUTIVO (KPIs)
     * Consolida custos de combustível, aditivos, manutenção e eficiência.
     */
    sumario = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
                res.status(403).json({ error: 'Acesso negado' });
                return;
            }

            const { ano, mes, veiculoId } = req.query as unknown as RelatorioQuery;
            const anoNum = Number(ano) || new Date().getFullYear();
            const mesNum = Number(mes) || new Date().getMonth() + 1;

            const dataInicio = new Date(anoNum, mesNum - 1, 1);
            const dataFim = new Date(anoNum, mesNum, 1);

            const filtroData = { gte: dataInicio, lt: dataFim };
            const filtroVeiculo = veiculoId ? { veiculoId } : {};

            const [combustivel, aditivo, manutencao, litros, jornadas] = await Promise.all([
                prisma.itemAbastecimento.aggregate({
                    _sum: { valorTotal: true },
                    where: {
                        produto: { tipo: 'COMBUSTIVEL' },
                        abastecimento: { dataHora: filtroData, ...filtroVeiculo }
                    }
                }),
                prisma.itemAbastecimento.aggregate({
                    _sum: { valorTotal: true },
                    where: {
                        produto: { tipo: 'ADITIVO' },
                        abastecimento: { dataHora: filtroData, ...filtroVeiculo }
                    }
                }),
                prisma.ordemServico.aggregate({
                    _sum: { custoTotal: true },
                    where: { data: filtroData, ...filtroVeiculo }
                }),
                prisma.itemAbastecimento.aggregate({
                    _sum: { quantidade: true },
                    where: {
                        produto: { tipo: 'COMBUSTIVEL' },
                        abastecimento: { dataHora: filtroData, ...filtroVeiculo }
                    }
                }),
                prisma.jornada.findMany({
                    where: { dataInicio: filtroData, kmFim: { not: null }, ...filtroVeiculo },
                    select: { kmInicio: true, kmFim: true }
                })
            ]);

            const kmTotal = jornadas.reduce((acc, j) => acc + ((j.kmFim ?? 0) - j.kmInicio), 0);

            // Conversão garantida para Number para evitar problemas de serialização Decimal
            const totalCombustivel = Number(combustivel._sum.valorTotal || 0);
            const totalAditivo = Number(aditivo._sum.valorTotal || 0);
            const totalManutencao = Number(manutencao._sum.custoTotal || 0);
            const litrosTotal = Number(litros._sum.quantidade || 0);
            const totalGeral = totalCombustivel + totalAditivo + totalManutencao;

            res.json({
                kpis: {
                    custoTotalGeral: totalGeral,
                    custoTotalCombustivel: totalCombustivel,
                    custoTotalAditivo: totalAditivo,
                    custoTotalManutencao: totalManutencao,
                    kmTotalRodado: kmTotal,
                    litrosTotaisConsumidos: litrosTotal,
                    consumoMedioKML: litrosTotal > 0 ? kmTotal / litrosTotal : 0,
                    custoMedioPorKM: kmTotal > 0 ? totalGeral / kmTotal : 0,
                }
            });
        } catch (e) { next(e); }
    }

    /**
     * RANKING DE OPERADORES
     * Calcula eficiência (KM/L) individual por motorista.
     */
    ranking = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
                res.status(403).json({ error: 'Acesso negado' });
                return;
            }

            const { ano, mes } = req.query as unknown as RelatorioQuery;
            const anoNum = Number(ano) || new Date().getFullYear();
            const mesNum = Number(mes) || new Date().getMonth() + 1;

            const dataInicio = new Date(anoNum, mesNum - 1, 1);
            const dataFim = new Date(anoNum, mesNum, 1);

            const [jornadas, abastecimentos, operadores] = await Promise.all([
                prisma.jornada.findMany({
                    where: { dataInicio: { gte: dataInicio, lt: dataFim }, kmFim: { not: null } },
                    select: { operadorId: true, kmInicio: true, kmFim: true }
                }),
                prisma.itemAbastecimento.findMany({
                    where: {
                        produto: { tipo: 'COMBUSTIVEL' },
                        abastecimento: { dataHora: { gte: dataInicio, lt: dataFim } }
                    },
                    select: {
                        quantidade: true,
                        abastecimento: { select: { operadorId: true } }
                    }
                }),
                prisma.user.findMany({
                    where: { role: 'OPERADOR' },
                    select: { id: true, nome: true }
                })
            ]);

            const kmsPorOperador = new Map<string, number>();
            jornadas.forEach(j => {
                const km = (j.kmFim ?? 0) - j.kmInicio;
                if (km > 0) kmsPorOperador.set(j.operadorId, (kmsPorOperador.get(j.operadorId) || 0) + km);
            });

            const litrosPorOperador = new Map<string, number>();
            abastecimentos.forEach(item => {
                const opId = item.abastecimento.operadorId;
                litrosPorOperador.set(opId, (litrosPorOperador.get(opId) || 0) + Number(item.quantidade));
            });

            const rankingData = operadores.map(op => {
                const km = kmsPorOperador.get(op.id) || 0;
                const litros = litrosPorOperador.get(op.id) || 0;
                return {
                    id: op.id,
                    nome: op.nome,
                    totalKM: km,
                    totalLitros: litros,
                    kml: litros > 0 ? km / litros : 0
                };
            }).filter(r => r.totalKM > 0 || r.totalLitros > 0).sort((a, b) => b.kml - a.kml);

            res.json(rankingData);
        } catch (error) { next(error); }
    }

    /**
     * ALERTAS GERAIS (Documentação e Previsão Inteligente de Manutenção)
     */
    alertas = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!['ADMIN', 'ENCARREGADO', 'RH'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Acesso negado' });
                return;
            }

            const alertas: any[] = [];
            const hoje = new Date();
            const dataLimite = addDays(hoje, 30);
            const limiteAlertaKM = 1500;

            // PERFORMANCE: Cache do KM atual dos veículos para evitar N+1 buscas
            const veiculosBase = await prisma.veiculo.findMany({ select: { id: true, ultimoKm: true } });
            const kmMap = new Map(veiculosBase.map(v => [v.id, v.ultimoKm || 0]));

            // 1. ALERTAS DE DOCUMENTOS (CIV e CIPP)
            const veiculosDocs = await prisma.veiculo.findMany({
                where: { OR: [{ vencimentoCiv: { lte: dataLimite } }, { vencimentoCipp: { lte: dataLimite } }] },
                select: { id: true, placa: true, vencimentoCiv: true, vencimentoCipp: true }
            });

            veiculosDocs.forEach(v => {
                if (v.vencimentoCiv && v.vencimentoCiv <= dataLimite) {
                    const vencido = v.vencimentoCiv < hoje;
                    alertas.push({ tipo: 'DOCUMENTO', nivel: vencido ? 'VENCIDO' : 'ATENCAO', mensagem: `CIV ${v.placa} ${vencido ? 'venceu' : 'vence'}: ${v.vencimentoCiv.toLocaleDateString('pt-BR')}` });
                }
                if (v.vencimentoCipp && v.vencimentoCipp <= dataLimite) {
                    const vencido = v.vencimentoCipp < hoje;
                    alertas.push({ tipo: 'DOCUMENTO', nivel: vencido ? 'VENCIDO' : 'ATENCAO', mensagem: `CIPP ${v.placa} ${vencido ? 'venceu' : 'vence'}: ${v.vencimentoCipp.toLocaleDateString('pt-BR')}` });
                }
            });

            // 2. ALERTAS DE MANUTENÇÃO (PLANOS)
            const planos = await prisma.planoManutencao.findMany({
                include: { veiculo: { select: { id: true, placa: true } } }
            });

            for (const p of planos) {
                // Lógica de Vencimento por TEMPO
                if (p.tipoIntervalo === 'TEMPO' && p.dataProximaManutencao && p.dataProximaManutencao <= dataLimite) {
                    const vencido = p.dataProximaManutencao < hoje;
                    alertas.push({ tipo: 'MANUTENCAO', nivel: vencido ? 'VENCIDO' : 'ATENCAO', mensagem: `Manutenção TEMPO (${p.descricao}) ${p.veiculo.placa} ${vencido ? 'venceu' : 'vence'}: ${p.dataProximaManutencao.toLocaleDateString('pt-BR')}` });
                }

                // Lógica de Vencimento por KM e PREVISÃO
                if (p.tipoIntervalo === 'KM' && p.kmProximaManutencao) {
                    const kmAtual = kmMap.get(p.veiculo.id) || 0;
                    const kmRestante = p.kmProximaManutencao - kmAtual;

                    if (kmRestante <= 0) {
                        alertas.push({ tipo: 'MANUTENCAO', nivel: 'VENCIDO', mensagem: `Manutenção KM (${p.descricao}) ${p.veiculo.placa} VENCIDA (KM atual: ${kmAtual.toLocaleString('pt-BR')})` });
                    } else {
                        try {
                            // Algoritmo de Previsão de Rodagem
                            const diasEstimados = await PrevisaoService.estimarDiasParaManutencao(p.veiculo.id, p.kmProximaManutencao, kmAtual);

                            if (diasEstimados !== null && diasEstimados <= 15) {
                                alertas.push({
                                    tipo: 'MANUTENCAO',
                                    nivel: 'ATENCAO',
                                    mensagem: `PREVISÃO: ${p.veiculo.placa} deve atingir o KM da ${p.descricao} em aprox. ${diasEstimados} dias.`
                                });
                            } else if (kmRestante <= limiteAlertaKM) {
                                alertas.push({
                                    tipo: 'MANUTENCAO',
                                    nivel: 'ATENCAO',
                                    mensagem: `Manutenção KM (${p.descricao}) ${p.veiculo.placa} vence em ${kmRestante.toLocaleString('pt-BR')} KM`
                                });
                            }
                        } catch (err) {
                            console.error(`[Previsao Error] ${p.veiculo.placa}:`, err);
                        }
                    }
                }
            }

            // Ordenação: Vencidos primeiro
            alertas.sort((a, b) => (a.nivel === 'VENCIDO' ? -1 : 1));
            res.json(alertas);
        } catch (e) { next(e); }
    }

    /**
     * RELATÓRIO DE LAVAGENS
     * Histórico e resumo financeiro anual de lavagens.
     */
    getRelatorioLavagens = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!['ADMIN', 'ENCARREGADO'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Acesso negado' });
                return;
            }

            const { ano } = req.query;
            const anoFiltro = Number(ano) || new Date().getFullYear();
            const startDate = new Date(anoFiltro, 0, 1);
            const endDate = new Date(anoFiltro, 11, 31, 23, 59, 59);

            const lavagens = await prisma.ordemServico.findMany({
                where: { data: { gte: startDate, lte: endDate }, tipo: 'LAVAGEM' },
                include: {
                    veiculo: true,
                    fornecedor: true,
                    itens: { include: { produto: true } }
                },
                orderBy: { data: 'asc' }
            });

            // Geração de resumo mensal de custos
            const resumoMensal = Array(12).fill(0);
            lavagens.forEach(l => {
                const mes = new Date(l.data).getMonth();
                resumoMensal[mes] += Number(l.custoTotal);
            });

            const resumoFormatado = resumoMensal.map((valor, index) => ({
                mes: new Date(anoFiltro, index, 1).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }),
                valorTotal: valor
            }));

            const lavagensFormatadas = lavagens.map(l => ({
                ...l,
                descricao: l.itens.length > 0 ? l.itens.map(i => i.produto.nome).join(' + ') : (l.observacoes || 'Lavagem Geral'),
                notaFiscal: l.observacoes
            }));

            res.json({ lavagens: lavagensFormatadas, resumoMensal: resumoFormatado, ano: anoFiltro });
        } catch (error) { next(error); }
    }
}