import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { KmService } from '../services/KmService';
import { JornadaService } from '../services/JornadaService';
import { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { iniciarJornadaSchema, finalizarJornadaSchema, buscaJornadaSchema } from '../schemas/jornada.schemas';

// Tipagem inferida
type IniciarJornadaData = z.infer<typeof iniciarJornadaSchema>['body'];
type FinalizarJornadaBody = z.infer<typeof finalizarJornadaSchema>['body'];
type BuscaJornadaQuery = z.infer<typeof buscaJornadaSchema>['query'];

export class JornadaController {

    // --- INICIAR JORNADA ---
    iniciar = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { veiculoId, encarregadoId, kmInicio, observacoes, fotoInicioUrl } = req.body as IniciarJornadaData;
            const operadorId = req.user?.userId;

            if (!operadorId) {
                res.status(401).json({ error: 'Usuário não autenticado.' });
                return;
            }

            if (!encarregadoId) {
                res.status(400).json({ error: 'É obrigatório informar um encarregado para iniciar a jornada.' });
                return;
            }

            // 0. BLINDAGEM MOTORISTA FANTASMA
            const jornadaEmAberto = await prisma.jornada.findFirst({
                where: {
                    operadorId: operadorId,
                    dataFim: null
                },
                include: { veiculo: true }
            });

            if (jornadaEmAberto) {
                res.status(409).json({
                    error: `Você já possui uma jornada em andamento no veículo ${jornadaEmAberto.veiculo.placa}. Finalize-a antes de iniciar uma nova.`
                });
                return;
            }

            const veiculo = await prisma.veiculo.findUnique({ where: { id: veiculoId } });
            const usuario = await prisma.user.findUnique({ where: { id: operadorId } });

            if (!veiculo || !usuario) {
                res.status(404).json({ error: 'Veículo ou usuário não encontrados.' });
                return;
            }

            // 0.5. BLINDAGEM DE CNH (Compliance)
            const tipoVeiculo = veiculo.tipoVeiculo?.toUpperCase() || '';
            const cnhCategoria = usuario.cnhCategoria?.toUpperCase() || '';
            const exigeCategoriaPesada = ['CAMINHAO', 'TRUCK', 'CARRETA', 'MUNCK', 'ONIBUS'].some(t => tipoVeiculo.includes(t));
            const temCategoriaPesada = ['C', 'D', 'E'].some(c => cnhCategoria.includes(c));

            if (exigeCategoriaPesada && !temCategoriaPesada) {
                console.warn(`[Compliance] Motorista ${usuario.nome} (CNH ${cnhCategoria}) iniciou jornada em veículo pesado ${veiculo.modelo}.`);
            }

            // 1. VALIDAÇÃO DE KM
            const ultimoKMConsolidado = await KmService.getUltimoKMRegistrado(veiculoId);
            const jornadaAbertaAnterior = await prisma.jornada.findFirst({
                where: { veiculoId: veiculoId, kmFim: null },
                orderBy: { dataInicio: 'desc' }
            });

            const kmReferencia = jornadaAbertaAnterior
                ? Math.max(ultimoKMConsolidado, jornadaAbertaAnterior.kmInicio)
                : ultimoKMConsolidado;

            if (kmInicio < kmReferencia) {
                res.status(400).json({
                    error: `KM Inválido! O veículo já possui registro de ${kmReferencia} KM. Verifique o painel.`
                });
                return;
            }

            // 2. TRANSAÇÃO DE RENDIÇÃO AUTOMÁTICA
            const novaJornada = await prisma.$transaction(async (tx) => {
                // Passo A: Fechar jornada anterior (se houver)
                if (jornadaAbertaAnterior) {
                    await tx.jornada.update({
                        where: { id: jornadaAbertaAnterior.id },
                        data: {
                            kmFim: kmInicio,
                            dataFim: new Date(),
                            observacoes: (jornadaAbertaAnterior.observacoes || '') + ' [Rendição: Fechado pelo próximo operador]'
                        }
                    });
                } else {
                    const ultimaJornadaFechada = await tx.jornada.findFirst({
                        where: { veiculoId: veiculoId, kmFim: { not: null } },
                        orderBy: { dataFim: 'desc' }
                    });

                    if (ultimaJornadaFechada && ultimaJornadaFechada.observacoes?.includes('[SYSTEM_AUTO_CLOSE]')) {
                        await tx.jornada.update({
                            where: { id: ultimaJornadaFechada.id },
                            data: {
                                kmFim: kmInicio,
                                observacoes: ultimaJornadaFechada.observacoes + ' [Correção: KM validado pelo próximo operador]'
                            }
                        });
                    }
                }

                // Passo B: Criar a nova jornada
                return await tx.jornada.create({
                    data: {
                        veiculoId,
                        operadorId,
                        encarregadoId,
                        dataInicio: new Date(),
                        kmInicio,
                        observacoes: observacoes ?? null,
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

    // --- FINALIZAR JORNADA ---
    finalizar = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { kmFim, observacoes, fotoFimUrl } = req.body as FinalizarJornadaBody;
            const { id } = req.params;

            if (!id) {
                res.status(400).json({ error: 'ID da jornada não fornecido.' });
                return;
            }

            const jornada = await prisma.jornada.findUnique({ where: { id } });
            if (!jornada) {
                res.status(404).json({ error: 'Jornada não encontrada.' });
                return;
            }

            const isDono = jornada.operadorId === req.user?.userId;
            const isGestor = ['ADMIN', 'ENCARREGADO'].includes(req.user?.role || '');

            if (!isDono && !isGestor) {
                res.status(403).json({ error: 'Sem permissão para fechar esta jornada.' });
                return;
            }

            if (jornada.dataFim) {
                res.status(400).json({ error: 'Jornada já finalizada.' });
                return;
            }

            if (kmFim < jornada.kmInicio) {
                res.status(400).json({ error: `KM Final (${kmFim}) não pode ser menor que o Inicial (${jornada.kmInicio}).` });
                return;
            }

            const ultimoKMGlobal = await KmService.getUltimoKMRegistrado(jornada.veiculoId);

            if (kmFim < ultimoKMGlobal && ultimoKMGlobal > jornada.kmInicio) {
                res.status(400).json({
                    error: `Inconsistência: Existe um registro com KM ${ultimoKMGlobal} posterior ao início desta jornada.`
                });
                return;
            }

            const finalizada = await prisma.jornada.update({
                where: { id },
                data: {
                    dataFim: new Date(),
                    kmFim: kmFim,
                    observacoes: observacoes ?? null,
                    fotoFimUrl: fotoFimUrl ?? null,
                },
            });

            res.json(finalizada);
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
            if (!userId) {
                res.status(401).json({ error: 'Não autenticado' });
                return;
            }

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

            if (dataInicio) where.dataInicio = { gte: new Date(dataInicio) };
            if (dataFim) {
                const fim = new Date(dataFim);
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

    verificarTimeouts = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            await JornadaService.fecharJornadasVencidas();
            res.json({ message: 'Verificação executada.', timestamp: new Date() });
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
            if (!id) {
                res.status(400).json({ error: 'ID inválido.' });
                return;
            }

            await prisma.jornada.delete({ where: { id } });
            res.json({ message: 'Jornada removida com sucesso.' });
        } catch (error) {
            next(error);
        }
    }
}