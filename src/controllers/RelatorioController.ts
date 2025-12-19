import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { KmService } from '../services/KmService';
import { AuthenticatedRequest } from '../middleware/auth';
import { addDays } from '../utils/dateUtils';
import { z } from 'zod';
import { relatorioQuerySchema } from '../schemas/relatorio.schemas';

// Extraímos a tipagem do schema (Query Params)
type RelatorioQuery = z.infer<typeof relatorioQuerySchema>['query'];

export class RelatorioController {

    sumario = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
                res.status(403).json({ error: 'Acesso negado' });
                return;
            }

            const { ano, mes, veiculoId } = req.query as unknown as RelatorioQuery;

            const anoNum = ano || new Date().getFullYear();
            const mesNum = mes || new Date().getMonth() + 1;

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

            // Conversão de Decimal para Number
            const totalCombustivel = Number(combustivel._sum.valorTotal || 0);
            const totalAditivo = Number(aditivo._sum.valorTotal || 0);
            const totalManutencao = Number(manutencao._sum.custoTotal || 0);

            const totalGeral = totalCombustivel + totalAditivo + totalManutencao;
            const litrosTotal = litros._sum.quantidade || 0;

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
        } catch (e) {
            next(e);
        }
    }

    ranking = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENCARREGADO') {
                res.status(403).json({ error: 'Acesso negado' });
                return;
            }

            const { ano, mes } = req.query as unknown as RelatorioQuery;

            const anoNum = ano || new Date().getFullYear();
            const mesNum = mes || new Date().getMonth() + 1;

            const dataInicio = new Date(anoNum, mesNum - 1, 1);
            const dataFim = new Date(anoNum, mesNum, 1);

            const [jornadas, abastecimentos] = await Promise.all([
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
                litrosPorOperador.set(opId, (litrosPorOperador.get(opId) || 0) + item.quantidade);
            });

            const operadores = await prisma.user.findMany({
                where: { role: 'OPERADOR' },
                select: { id: true, nome: true }
            });

            const ranking = operadores.map(op => {
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

            res.json(ranking);
        } catch (error) {
            next(error);
        }
    }

    alertas = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!['ADMIN', 'ENCARREGADO', 'RH'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Acesso negado' });
                return;
            }

            const alertas = [];
            const hoje = new Date();
            const dataLimite = addDays(hoje, 30);
            const limiteAlertaKM = 1500;

            const veiculosDocs = await prisma.veiculo.findMany({
                where: { OR: [{ vencimentoCiv: { lte: dataLimite } }, { vencimentoCipp: { lte: dataLimite } }] },
                select: { id: true, placa: true, vencimentoCiv: true, vencimentoCipp: true }
            });

            for (const v of veiculosDocs) {
                if (v.vencimentoCiv && v.vencimentoCiv <= dataLimite) {
                    const vencido = v.vencimentoCiv < hoje;
                    alertas.push({ tipo: 'DOCUMENTO', nivel: vencido ? 'VENCIDO' : 'ATENCAO', mensagem: `CIV ${v.placa} ${vencido ? 'venceu' : 'vence'}: ${v.vencimentoCiv.toLocaleDateString('pt-BR')}` });
                }
                if (v.vencimentoCipp && v.vencimentoCipp <= dataLimite) {
                    const vencido = v.vencimentoCipp < hoje;
                    alertas.push({ tipo: 'DOCUMENTO', nivel: vencido ? 'VENCIDO' : 'ATENCAO', mensagem: `CIPP ${v.placa} ${vencido ? 'venceu' : 'vence'}: ${v.vencimentoCipp.toLocaleDateString('pt-BR')}` });
                }
            }

            const planos = await prisma.planoManutencao.findMany({ include: { veiculo: { select: { id: true, placa: true } } } });

            for (const p of planos) {
                if (p.tipoIntervalo === 'TEMPO' && p.dataProximaManutencao && p.dataProximaManutencao <= dataLimite) {
                    const vencido = p.dataProximaManutencao < hoje;
                    alertas.push({ tipo: 'MANUTENCAO', nivel: vencido ? 'VENCIDO' : 'ATENCAO', mensagem: `Manutenção TEMPO (${p.descricao}) ${p.veiculo.placa} ${vencido ? 'venceu' : 'vence'}: ${p.dataProximaManutencao.toLocaleDateString('pt-BR')}` });
                }
                if (p.tipoIntervalo === 'KM' && p.kmProximaManutencao) {
                    const kmAtual = await KmService.getUltimoKMRegistrado(p.veiculo.id);
                    const kmRestante = p.kmProximaManutencao - kmAtual;

                    if (kmRestante <= 0) {
                        alertas.push({ tipo: 'MANUTENCAO', nivel: 'VENCIDO', mensagem: `Manutenção KM (${p.descricao}) ${p.veiculo.placa} VENCIDA (KM atual: ${kmAtual})` });
                    } else if (kmRestante <= limiteAlertaKM) {
                        alertas.push({ tipo: 'MANUTENCAO', nivel: 'ATENCAO', mensagem: `Manutenção KM (${p.descricao}) ${p.veiculo.placa} vence em ${kmRestante.toFixed(0)} KM` });
                    }
                }
            }

            alertas.sort((a, b) => (a.nivel === 'VENCIDO' ? -1 : 1));
            res.json(alertas);
        } catch (e) {
            next(e);
        }
    }

    /**
     * Relatório Específico de Lavagens (Excel)
     * Busca manutenções (OrdemServico) do tipo LAVAGEM.
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

            // CORREÇÃO: Usamos 'ordemServico' e filtramos pelo ENUM 'LAVAGEM'
            const lavagens = await prisma.ordemServico.findMany({
                where: {
                    data: {
                        gte: startDate,
                        lte: endDate
                    },
                    // Usando o Enum TipoManutencao.LAVAGEM
                    tipo: 'LAVAGEM'
                },
                include: {
                    veiculo: true,
                    fornecedor: true,
                    // Incluímos itens para poder gerar a descrição detalhada (ex: "Lavagem Simples")
                    itens: {
                        include: {
                            produto: true
                        }
                    }
                },
                orderBy: {
                    data: 'asc'
                }
            });

            // Calcula o resumo mensal (Mês Ref | Valor Mensal)
            const resumoMensal = Array(12).fill(0);
            
            lavagens.forEach(l => {
                const mes = new Date(l.data).getMonth(); // 0 = Jan, 11 = Dez
                resumoMensal[mes] += Number(l.custoTotal);
            });

            const resumoFormatado = resumoMensal.map((valor, index) => ({
                mes: new Date(anoFiltro, index, 1).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }),
                valorTotal: valor
            }));

            // Tratamento para enviar dados amigáveis ao Excel
            const lavagensFormatadas = lavagens.map(l => {
                // Se houver itens, junta os nomes dos produtos para formar a descrição
                // Caso contrário usa 'Lavagem Geral' ou observações
                const descricao = l.itens.length > 0 
                    ? l.itens.map(i => i.produto.nome).join(' + ') 
                    : (l.observacoes || 'Lavagem');

                return {
                    ...l,
                    descricao, // Sobrescreve para facilitar no frontend
                    notaFiscal: l.observacoes // Usamos obs como "Ticket/Nota" provisório, já que não há campo específico
                };
            });

            res.json({
                lavagens: lavagensFormatadas,
                resumoMensal: resumoFormatado,
                ano: anoFiltro
            });

        } catch (error) {
            next(error);
        }
    }
}