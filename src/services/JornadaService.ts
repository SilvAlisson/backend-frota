import { prisma } from '../lib/prisma';

// Configurações
const MAX_RETRIES = 3;
const BATCH_SIZE = 50;
const HORAS_TOLERANCIA = 17; // Reduzi para 17h (turno + descanso) para ser mais ágil
const EMAIL_BOT = 'sistema@frota.ghost';

const FANTASMAS = [
    "👻 O Fantasma Juca", "👽 ET de Varginha", "🦶 Pé Grande da Boleia",
    "🧚 Fada do Diesel", "🧛 Conde Drácula do Asfalto", "🧟 Zumbi da Madrugada",
    "🧙 Mago do Câmbio", "🤖 O Robô do RH", "🏴‍☠️ Pirata da BR"
];

export class JornadaService {

    /**
     * Calcula média histórica com Fallback seguro
     */
    private static async calcularMediaDiariaHistorica(veiculoId: string): Promise<number> {
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

        try {
            const historico = await prisma.jornada.findMany({
                where: {
                    veiculoId,
                    dataFim: { gte: trintaDiasAtras },
                    kmFim: { not: null },
                    kmInicio: { not: null }
                },
                select: { kmInicio: true, kmFim: true },
                take: 10 // Pega apenas os últimos 10 para ser rápido
            });

            if (historico.length < 3) return 100; // Valor padrão conservador

            let totalKm = 0;
            let contagemValida = 0;

            for (const j of historico) {
                if (j.kmFim && j.kmInicio && j.kmFim > j.kmInicio) {
                    totalKm += (j.kmFim - j.kmInicio);
                    contagemValida++;
                }
            }

            if (contagemValida === 0) return 100;
            const media = Math.ceil(totalKm / contagemValida);
            return media > 10 ? media : 100;
        } catch (e) {
            return 100;
        }
    }

    /**
     * Executa o fechamento com tratamento de erro isolado
     */
    static async fecharJornadasVencidas() {
        console.log('🛡️ [Cron Blindado] Iniciando Auditoria...');

        // 1. Busca o ID do Bot (Uma única vez por execução)
        const botUser = await prisma.user.findUnique({ where: { email: EMAIL_BOT } });

        if (!botUser) {
            console.error(`❌ ERRO CRÍTICO: Usuário Bot (${EMAIL_BOT}) não encontrado. Rode o seed!`);
            return;
        }

        const dataLimite = new Date();
        dataLimite.setHours(dataLimite.getHours() - HORAS_TOLERANCIA);

        // 2. Busca em Lote (Batching)
        const jornadasVencidas = await prisma.jornada.findMany({
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
                // Passamos o ID do Bot para a função de processamento
                await this.processarJornadaUnica(jornada, botUser.id);

            } catch (error: any) {
                console.error(`❌ [Cron] Falha na jornada ID ${jornada.id}: ${error.message}`);

                // ATUALIZAÇÃO DE FALHA (DLQ)
                await prisma.jornada.update({
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
    private static async processarJornadaUnica(jornada: any, botId: string) {
        await prisma.$transaction(async (tx) => {

            // Busca Próximo Ponto Real
            const proximoRegistro = await tx.historicoKm.findFirst({
                where: {
                    veiculoId: jornada.veiculoId,
                    dataLeitura: { gt: jornada.dataInicio },
                    km: { gte: jornada.kmInicio }
                },
                orderBy: { dataLeitura: 'asc' }
            });

            // CENÁRIO 1: Sem dados futuros (Apenas fecha)
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

            // Validação de Integridade
            if (proximoRegistro.km < jornada.kmInicio) {
                throw new Error(`Inconsistência Crítica: KM Futuro (${proximoRegistro.km}) menor que Início (${jornada.kmInicio})`);
            }

            const kmNaoRegistrado = proximoRegistro.km - jornada.kmInicio;
            const mediaDiaria = await JornadaService.calcularMediaDiariaHistorica(jornada.veiculoId);
            const limiteAceitavel = (mediaDiaria * 1.2) + 50; // Margem de tolerância

            // CENÁRIO 2: Erro pequeno (Assume que foi erro de digitação/esquecimento simples)
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

            // CENÁRIO 3: Geração de Fantasmas (Usa o BOT)

            // 3.1 Fecha a jornada original do HUMANO com 0 KM de ganho (para não ganhar produtividade falsa)
            const dataFimJornadaOriginal = new Date(jornada.dataInicio);
            dataFimJornadaOriginal.setHours(dataFimJornadaOriginal.getHours() + 9); // Teto de 9h de trabalho

            const dataFechamentoReal = dataFimJornadaOriginal < proximoRegistro.dataLeitura
                ? dataFimJornadaOriginal
                : proximoRegistro.dataLeitura;

            await tx.jornada.update({
                where: { id: jornada.id },
                data: {
                    dataFim: dataFechamentoReal,
                    kmFim: jornada.kmInicio, // Humano não rodou esse KM oficialmente
                    observacoes: (jornada.observacoes || '') + ` [AUTO: Gap de ${kmNaoRegistrado}km detectado. Fantasmas assumiram.]`,
                    tentativasAutoFechamento: 0,
                    erroAutoFechamento: null
                }
            });

            // 3.2 Loop de Fantasmas
            let kmRestante = kmNaoRegistrado;
            let ponteiroKm = jornada.kmInicio;
            let ponteiroData = new Date(dataFechamentoReal);
            ponteiroData.setHours(ponteiroData.getHours() + 1);

            let contadorSeguranca = 0;

            while (kmRestante > 0 && contadorSeguranca < 30) {
                if (ponteiroData >= proximoRegistro.dataLeitura) break;

                let kmDeste = Math.min(mediaDiaria, kmRestante);
                if ((kmRestante - kmDeste) < 20) kmDeste = kmRestante; // Evita resíduos pequenos

                let fimDeste = new Date(ponteiroData);
                fimDeste.setHours(fimDeste.getHours() + 8); // Jornada padrão do fantasma

                if (fimDeste > proximoRegistro.dataLeitura) fimDeste = proximoRegistro.dataLeitura;

                const nome = FANTASMAS[Math.floor(Math.random() * FANTASMAS.length)];

                await tx.jornada.create({
                    data: {
                        veiculoId: jornada.veiculoId,
                        operadorId: botId, // <--- AQUI: O BOT ASSUME
                        encarregadoId: jornada.encarregadoId, // Mantém o encarregado original para rastreio
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

            // 3.3 Fantasma de Ajuste Final (Sobra de tempo/km)
            if (kmRestante > 0) {
                await tx.jornada.create({
                    data: {
                        veiculoId: jornada.veiculoId,
                        operadorId: botId, // <--- AQUI: O BOT ASSUME
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