import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { KmService } from '../services/KmService';
import { JornadaService } from '../services/JornadaService';
import { AuthenticatedRequest } from '../middleware/auth';
import { OcrService } from '../services/OcrService';
import { z } from 'zod';
import {
    iniciarJornadaSchema,
    finalizarJornadaSchema,
    buscaJornadaSchema
} from '../schemas/jornada.schemas';

// Tipagem extraída dos Schemas Zod
type IniciarJornadaData = z.infer<typeof iniciarJornadaSchema>['body'];
type FinalizarJornadaBody = z.infer<typeof finalizarJornadaSchema>['body'];
type BuscaJornadaQuery = z.infer<typeof buscaJornadaSchema>['query'];

export class JornadaController {

    /**
     * INICIAR JORNADA
     * Inclui: Blindagem de motorista, Inteligência de Escala e Reconstituição de Inatividade
     */
    iniciar = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { veiculoId, encarregadoId, kmInicio: kmDigitado, observacoes, fotoInicioUrl } = req.body as IniciarJornadaData;
            const operadorId = req.user?.userId;

            if (!operadorId || !encarregadoId) {
                res.status(401).json({ error: 'Usuário não autenticado ou encarregado não informado.' });
                return;
            }

            // 0. BLINDAGEM: Verifica se o operador já tem algo aberto
            const jornadaEmAberto = await prisma.jornada.findFirst({
                where: { operadorId, dataFim: null },
                include: { veiculo: true }
            });

            if (jornadaEmAberto) {
                res.status(409).json({
                    error: `Você já possui uma jornada em andamento no veículo ${jornadaEmAberto.veiculo.placa}.`
                });
                return;
            }

            // 1. INTELIGÊNCIA DE ESCALA (Trata erro de dígito extra/vírgula)
            const ultimoKMConsolidado = await KmService.getUltimoKMRegistrado(veiculoId);
            let kmProcessado = kmDigitado;

            if (ultimoKMConsolidado > 0 && kmDigitado > (ultimoKMConsolidado * 5)) {
                kmProcessado = Math.floor(kmDigitado / 10);
            }

            if (kmProcessado < ultimoKMConsolidado) {
                res.status(400).json({
                    error: `KM Inválido! O veículo já possui registro de ${ultimoKMConsolidado} KM. Digitado: ${kmProcessado}.`
                });
                return;
            }

            const novaJornada = await prisma.$transaction(async (tx) => {

                // 2. RECONSTITUIÇÃO DE HISTÓRICO (Rateio por dias de inatividade)
                const ultimaJornadaFechada = await tx.jornada.findFirst({
                    where: { veiculoId, kmFim: { not: null } },
                    orderBy: { dataFim: 'desc' }
                });

                if (ultimaJornadaFechada?.dataFim) {
                    const diffMs = new Date().getTime() - new Date(ultimaJornadaFechada.dataFim).getTime();
                    const diasInativos = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                    const kmTotalFaltante = kmProcessado - (ultimaJornadaFechada.kmFim || 0);

                    if (diasInativos >= 1 && kmTotalFaltante > 50) {
                        const kmDiario = Math.floor(kmTotalFaltante / (diasInativos + 1));
                        const ajustes = [];

                        for (let i = 1; i <= diasInativos; i++) {
                            const dataAjuste = new Date(ultimaJornadaFechada.dataFim);
                            dataAjuste.setDate(dataAjuste.getDate() + i);

                            ajustes.push({
                                veiculoId,
                                operadorId,
                                encarregadoId,
                                dataInicio: dataAjuste,
                                dataFim: dataAjuste,
                                kmInicio: (ultimaJornadaFechada.kmFim || 0) + (kmDiario * (i - 1)),
                                kmFim: (ultimaJornadaFechada.kmFim || 0) + (kmDiario * i),
                                observacoes: `[AJUSTE AUTOMÁTICO] Veículo sem registro por ${diasInativos} dias. KM rateado.`
                            });
                        }
                        await tx.jornada.createMany({ data: ajustes });
                    }
                }

                // 3. FECHAR RENDIÇÕES ANTERIORES
                await tx.jornada.updateMany({
                    where: { veiculoId, dataFim: null },
                    data: {
                        kmFim: kmProcessado,
                        dataFim: new Date(),
                        observacoes: '[RENDIÇÃO] Fechado automaticamente pelo próximo operador.'
                    }
                });

                // 4. CRIAR A JORNADA ATUAL
                return await tx.jornada.create({
                    data: {
                        veiculoId,
                        operadorId,
                        encarregadoId,
                        dataInicio: new Date(),
                        kmInicio: kmProcessado,
                        observacoes: kmProcessado !== kmDigitado
                            ? (observacoes || '') + ` [Correção escala: Original era ${kmDigitado}]`
                            : (observacoes ?? null),
                        fotoInicioUrl: fotoInicioUrl ?? null,
                    },
                    include: { veiculo: true, encarregado: true }
                });
            });

            res.status(201).json(novaJornada);

        } catch (error) {
            next(error);
        }
    }

    /**
     * FINALIZAR JORNADA
     */
    finalizar = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { kmFim: kmDigitado, observacoes, fotoFimUrl } = req.body as FinalizarJornadaBody;
            const { id } = req.params;

            if (!id) {
                res.status(400).json({ error: 'ID da jornada não fornecido.' });
                return;
            }

            const jornada = await prisma.jornada.findUnique({ where: { id: String(id) } });
            if (!jornada || jornada.dataFim) {
                res.status(404).json({ error: 'Jornada não encontrada ou já finalizada.' });
                return;
            }

            const tempoDecorridoMs = new Date().getTime() - new Date(jornada.dataInicio).getTime();
            const horasDecurso = Math.max(tempoDecorridoMs / (1000 * 60 * 60), 0.1);

            let kmFimProcessado = kmDigitado;

            // 1. AUDITORIA OCR
            if (fotoFimUrl) {
                const kmLidoOCR = await OcrService.lerOdometro(fotoFimUrl);
                if (kmLidoOCR) {
                    const escalaOCR = Math.floor(kmLidoOCR / 10);
                    if (Math.abs(escalaOCR - kmDigitado) < 5) {
                        kmFimProcessado = escalaOCR;
                    }
                }
            }

            // 2. VALIDAÇÃO POR VELOCIDADE MÉDIA
            let velocidade = (kmFimProcessado - jornada.kmInicio) / horasDecurso;

            if (velocidade > 150) {
                const kmCorrigido = Math.floor(kmDigitado / 10);
                const novaVelocidade = (kmCorrigido - jornada.kmInicio) / horasDecurso;

                if (novaVelocidade <= 150 && novaVelocidade >= 0) {
                    kmFimProcessado = kmCorrigido;
                } else {
                    res.status(400).json({
                        error: `KM Final impossível (${velocidade.toFixed(0)} km/h). Verifique o odômetro.`
                    });
                    return;
                }
            }

            if (kmFimProcessado < jornada.kmInicio) {
                res.status(400).json({ error: `KM Final (${kmFimProcessado}) menor que o Inicial (${jornada.kmInicio}).` });
                return;
            }

            const finalizada = await prisma.$transaction(async (tx) => {
                const update = await tx.jornada.update({
                    where: { id: String(id) },
                    data: {
                        dataFim: new Date(),
                        kmFim: kmFimProcessado,
                        observacoes: kmFimProcessado !== kmDigitado
                            ? (observacoes || '') + ` [Ajuste Escala/OCR: Digitado ${kmDigitado}]`
                            : (observacoes ?? null),
                        fotoFimUrl: fotoFimUrl ?? null,
                    },
                });

                await tx.veiculo.update({
                    where: { id: jornada.veiculoId },
                    data: { ultimoKm: kmFimProcessado }
                });

                await tx.historicoKm.create({
                    data: {
                        km: kmFimProcessado,
                        origem: "JORNADA",
                        origemId: String(id),
                        veiculoId: jornada.veiculoId
                    }
                });

                return update;
            });

            res.json(finalizada);
        } catch (error) {
            next(error);
        }
    }

    // --- FUNÇÃO: UPDATE (Edição administrativa) ---
    update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!['ADMIN', 'ENCARREGADO'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Apenas gestores podem corrigir jornadas.' });
                return;
            }

            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'ID da jornada é obrigatório.' });
                return;
            }

            const dados = req.body;

            // Validações básicas
            if (dados.kmInicio !== undefined && dados.kmFim !== undefined && dados.kmFim !== null) {
                if (dados.kmFim < dados.kmInicio) {
                    res.status(400).json({ error: 'KM Final não pode ser menor que o Inicial.' });
                    return;
                }
            }

            if (dados.dataInicio && dados.dataFim) {
                if (new Date(dados.dataFim) < new Date(dados.dataInicio)) {
                    res.status(400).json({ error: 'Data Final não pode ser anterior à Data Inicial.' });
                    return;
                }
            }

            const dataToUpdate: any = {};
            if (dados.kmInicio !== undefined) dataToUpdate.kmInicio = dados.kmInicio;
            if (dados.kmFim !== undefined) dataToUpdate.kmFim = dados.kmFim;
            if (dados.observacoes !== undefined) dataToUpdate.observacoes = dados.observacoes;
            if (dados.dataInicio) dataToUpdate.dataInicio = new Date(dados.dataInicio);
            if (dados.dataFim !== undefined) dataToUpdate.dataFim = dados.dataFim ? new Date(dados.dataFim) : null;

            const jornadaAtualizada = await prisma.jornada.update({
                where: { id: String(id) },
                data: dataToUpdate
            });

            res.json(jornadaAtualizada);
        } catch (error) {
            next(error);
        }
    }

    // --- FUNÇÃO: UPDATE ---
    update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            // 1. Permissão
            if (!['ADMIN', 'ENCARREGADO'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Apenas gestores podem corrigir jornadas.' });
                return;
            }

            const { id } = req.params;
            
            // Garantir que ID existe antes de usar
            if (!id) {
                res.status(400).json({ error: 'ID da jornada é obrigatório.' });
                return;
            }

            const dados = req.body; 

            // 2. Validação Lógica
            if (dados.kmInicio !== undefined && dados.kmFim !== undefined && dados.kmFim !== null) {
                if (dados.kmFim < dados.kmInicio) {
                    res.status(400).json({ error: 'KM Final não pode ser menor que o Inicial.' });
                    return;
                }
            }

            // 3. Validação de Datas
            if (dados.dataInicio && dados.dataFim) {
                if (new Date(dados.dataFim) < new Date(dados.dataInicio)) {
                    res.status(400).json({ error: 'Data Final não pode ser anterior à Data Inicial.' });
                    return;
                }
            }

            // Montar objeto dinamicamente
            // Em vez de passar "undefined", nós só adicionamos a chave se ela existir.
            const dataToUpdate: any = {};

            if (dados.kmInicio !== undefined) dataToUpdate.kmInicio = dados.kmInicio;
            if (dados.kmFim !== undefined) dataToUpdate.kmFim = dados.kmFim;
            if (dados.observacoes !== undefined) dataToUpdate.observacoes = dados.observacoes;
            
            if (dados.dataInicio) {
                dataToUpdate.dataInicio = new Date(dados.dataInicio);
            }

            if (dados.dataFim !== undefined) {
                // Se for null, limpa a data (reabre a viagem). Se for string, converte.
                dataToUpdate.dataFim = dados.dataFim ? new Date(dados.dataFim) : null;
            }

            // 4. Atualizar no Banco
            const jornadaAtualizada = await prisma.jornada.update({
                where: { id: String(id) }, // Forçamos String(id) para calar o TypeScript
                data: dataToUpdate
            });

            res.json(jornadaAtualizada);
        } catch (error) {
            next(error);
        }
    }

    // --- LISTAGENS ---
    listarAbertas = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const list = await prisma.jornada.findMany({
                where: { kmFim: null },
                include: { veiculo: true, operador: true },
                orderBy: { dataInicio: 'desc' }
            });
            res.json(list);
        } catch (error) {
            next(error);
        }
    }

    listarMinhasAbertas = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ error: 'Não autenticado' });

            const list = await prisma.jornada.findMany({
                where: { operadorId: userId, kmFim: null },
                include: { veiculo: true, encarregado: true },
                orderBy: { dataInicio: 'desc' }
            });
            res.json(list);
        } catch (error) {
            next(error);
        }
    }

    listarHistorico = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!['ADMIN', 'ENCARREGADO'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }

            const { dataInicio, dataFim, veiculoId, operadorId } = req.query as unknown as BuscaJornadaQuery;
            const where: any = { kmFim: { not: null } };

            if (dataInicio) where.dataInicio = { gte: new Date(dataInicio as string) };
            if (dataFim) {
                const fim = new Date(dataFim as string);
                fim.setDate(fim.getDate() + 1);
                where.dataInicio = { ...where.dataInicio, lt: fim };
            }
            if (veiculoId) where.veiculoId = veiculoId;
            if (operadorId) where.operadorId = operadorId;

            const historico = await prisma.jornada.findMany({
                where,
                include: {
                    veiculo: { select: { placa: true, modelo: true } },
                    operador: { select: { nome: true } },
                    encarregado: { select: { nome: true } }
                },
                orderBy: { dataInicio: 'desc' },
                take: 100
            });

            const formatado = historico.map(j => ({
                ...j,
                kmPercorrido: (j.kmFim || 0) - j.kmInicio
            }));

            res.json(formatado);
        } catch (error) {
            next(error);
        }
    }

    delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!['ADMIN', 'ENCARREGADO'].includes(req.user?.role || '')) {
                res.status(403).json({ error: 'Acesso negado.' });
                return;
            }

            const { id } = req.params;
            if (!id) return res.status(400).json({ error: 'ID inválido.' });

            await prisma.jornada.delete({ where: { id: String(id) } });
            res.json({ message: 'Jornada removida com sucesso.' });
        } catch (error) {
            next(error);
        }
    }

    verificarTimeouts = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            await JornadaService.fecharJornadasVencidas();
            res.json({ message: 'Verificação executada.', timestamp: new Date() });
        } catch (error) {
            next(error);
        }
    }
}