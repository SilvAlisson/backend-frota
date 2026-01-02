"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JornadaService = void 0;
const prisma_1 = require("../lib/prisma");
// Configurações
const MAX_RETRIES = 3;
const BATCH_SIZE = 50;
const HORAS_TOLERANCIA = 17;
const EMAIL_BOT = 'sistema@frota.ghost';
const FANTASMAS = [
    "👻 O Fantasma Juca", "👽 ET de Varginha", "🦶 Pé Grande da Boleia",
    "🧚 Fada do Diesel", "🧛 Conde Drácula do Asfalto", "🧟 Zumbi da Madrugada",
    "🧙 Mago do Câmbio", "🤖 O Robô do RH", "🏴‍☠️ Pirata da BR"
];
class JornadaService {
    /**
     * Calcula média histórica com Fallback seguro
     */
    static async calcularMediaDiariaHistorica(veiculoId) {
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
        try {
            const historico = await prisma_1.prisma.jornada.findMany({
                where: {
                    veiculoId,
                    dataFim: { gte: trintaDiasAtras },
                    // [CORREÇÃO] gte: 0 garante que não é null e é um número válido para o TS
                    kmFim: { gte: 0 },
                    kmInicio: { gte: 0 } // <-- Alterado de { not: null } para { gte: 0 }
                },
                select: { kmInicio: true, kmFim: true },
                take: 10
            });
            if (historico.length < 3)
                return 100;
            let totalKm = 0;
            let contagemValida = 0;
            for (const j of historico) {
                // Verificação de tipo em tempo de execução para segurança extra
                if (typeof j.kmFim === 'number' && typeof j.kmInicio === 'number' && j.kmFim > j.kmInicio) {
                    totalKm += (j.kmFim - j.kmInicio);
                    contagemValida++;
                }
            }
            if (contagemValida === 0)
                return 100;
            const media = Math.ceil(totalKm / contagemValida);
            return media > 10 ? media : 100;
        }
        catch (e) {
            return 100;
        }
    }
    /**
     * Executa o fechamento com tratamento de erro isolado
     */
    static async fecharJornadasVencidas() {
        console.log('🛡️ [Cron Blindado] Iniciando Auditoria...');
        const botUser = await prisma_1.prisma.user.findUnique({ where: { email: EMAIL_BOT } });
        if (!botUser) {
            console.error(`❌ ERRO CRÍTICO: Usuário Bot (${EMAIL_BOT}) não encontrado. Rode o seed!`);
            return;
        }
        const dataLimite = new Date();
        dataLimite.setHours(dataLimite.getHours() - HORAS_TOLERANCIA);
        const jornadasVencidas = await prisma_1.prisma.jornada.findMany({
            where: {
                dataInicio: { lt: dataLimite },
                dataFim: null,
                tentativasAutoFechamento: { lt: MAX_RETRIES }
            },
            take: BATCH_SIZE,
            include: { veiculo: true }
        });
        if (jornadasVencidas.length === 0) {
            console.log('✅ [Cron] Nenhuma jornada pendente processável.');
            return;
        }
        console.log(`Processing batch de ${jornadasVencidas.length} jornadas...`);
        for (const jornada of jornadasVencidas) {
            try {
                await this.processarJornadaUnica(jornada, botUser.id);
            }
            catch (error) {
                console.error(`❌ [Cron] Falha na jornada ID ${jornada.id}: ${error.message}`);
                await prisma_1.prisma.jornada.update({
                    where: { id: jornada.id },
                    data: {
                        tentativasAutoFechamento: { increment: 1 },
                        erroAutoFechamento: error.message?.substring(0, 500) || "Erro desconhecido"
                    }
                });
            }
        }
    }
    /**
     * Lógica Core isolada
     */
    static async processarJornadaUnica(jornada, botId) {
        await prisma_1.prisma.$transaction(async (tx) => {
            const proximoRegistro = await tx.historicoKm.findFirst({
                where: {
                    veiculoId: jornada.veiculoId,
                    dataLeitura: { gt: jornada.dataInicio },
                    km: { gte: jornada.kmInicio }
                },
                orderBy: { dataLeitura: 'asc' }
            });
            if (!proximoRegistro) {
                await tx.jornada.update({
                    where: { id: jornada.id },
                    data: {
                        dataFim: new Date(),
                        kmFim: jornada.kmInicio,
                        observacoes: (jornada.observacoes || '') + " [AUTO: Fechado por inatividade. Sem leitura posterior.]",
                        tentativasAutoFechamento: 0,
                        erroAutoFechamento: null
                    }
                });
                return;
            }
            if (proximoRegistro.km < jornada.kmInicio) {
                throw new Error(`Inconsistência Crítica: KM Futuro (${proximoRegistro.km}) menor que Início (${jornada.kmInicio})`);
            }
            const kmNaoRegistrado = proximoRegistro.km - jornada.kmInicio;
            const mediaDiaria = await JornadaService.calcularMediaDiariaHistorica(jornada.veiculoId);
            const limiteAceitavel = (mediaDiaria * 1.2) + 50;
            if (kmNaoRegistrado <= limiteAceitavel) {
                await tx.jornada.update({
                    where: { id: jornada.id },
                    data: {
                        dataFim: proximoRegistro.dataLeitura,
                        kmFim: proximoRegistro.km,
                        observacoes: (jornada.observacoes || '') + " [AUTO: Ajuste automático simples]",
                        tentativasAutoFechamento: 0,
                        erroAutoFechamento: null
                    }
                });
                return;
            }
            const dataFimJornadaOriginal = new Date(jornada.dataInicio);
            dataFimJornadaOriginal.setHours(dataFimJornadaOriginal.getHours() + 9);
            const dataFechamentoReal = dataFimJornadaOriginal < proximoRegistro.dataLeitura
                ? dataFimJornadaOriginal
                : proximoRegistro.dataLeitura;
            await tx.jornada.update({
                where: { id: jornada.id },
                data: {
                    dataFim: dataFechamentoReal,
                    kmFim: jornada.kmInicio,
                    observacoes: (jornada.observacoes || '') + ` [AUTO: Gap de ${kmNaoRegistrado}km detectado. Fantasmas assumiram.]`,
                    tentativasAutoFechamento: 0,
                    erroAutoFechamento: null
                }
            });
            let kmRestante = kmNaoRegistrado;
            let ponteiroKm = jornada.kmInicio;
            let ponteiroData = new Date(dataFechamentoReal);
            ponteiroData.setHours(ponteiroData.getHours() + 1);
            let contadorSeguranca = 0;
            while (kmRestante > 0 && contadorSeguranca < 30) {
                if (ponteiroData >= proximoRegistro.dataLeitura)
                    break;
                let kmDeste = Math.min(mediaDiaria, kmRestante);
                if ((kmRestante - kmDeste) < 20)
                    kmDeste = kmRestante;
                let fimDeste = new Date(ponteiroData);
                fimDeste.setHours(fimDeste.getHours() + 8);
                if (fimDeste > proximoRegistro.dataLeitura)
                    fimDeste = proximoRegistro.dataLeitura;
                const nome = FANTASMAS[Math.floor(Math.random() * FANTASMAS.length)];
                await tx.jornada.create({
                    data: {
                        veiculoId: jornada.veiculoId,
                        operadorId: botId,
                        encarregadoId: jornada.encarregadoId,
                        dataInicio: ponteiroData,
                        dataFim: fimDeste,
                        kmInicio: ponteiroKm,
                        kmFim: ponteiroKm + kmDeste,
                        observacoes: `👻 ROTA NÃO IDENTIFICADA (${nome}) - Sistema Auto`,
                        tentativasAutoFechamento: 0
                    }
                });
                kmRestante -= kmDeste;
                ponteiroKm += kmDeste;
                ponteiroData = new Date(fimDeste);
                ponteiroData.setHours(ponteiroData.getHours() + 2);
                contadorSeguranca++;
            }
            if (kmRestante > 0) {
                await tx.jornada.create({
                    data: {
                        veiculoId: jornada.veiculoId,
                        operadorId: botId,
                        encarregadoId: jornada.encarregadoId,
                        dataInicio: ponteiroData < proximoRegistro.dataLeitura ? ponteiroData : proximoRegistro.dataLeitura,
                        dataFim: proximoRegistro.dataLeitura,
                        kmInicio: ponteiroKm,
                        kmFim: ponteiroKm + kmRestante,
                        observacoes: `👻 AJUSTE FINAL (${kmRestante.toFixed(1)}km) - Sistema Auto`
                    }
                });
            }
        });
    }
}
exports.JornadaService = JornadaService;
//# sourceMappingURL=JornadaService.js.map