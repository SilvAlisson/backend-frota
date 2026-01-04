export declare class PrevisaoService {
    /**
     * Calcula a média de KM rodado por dia nos últimos 30 dias.
     */
    static calcularMediaDiaria(veiculoId: string): Promise<number>;
    /**
     * Estima em quantos dias o veículo atingirá o KM da próxima manutenção
     * RENOMEADO: de estimarDiasParaKm para estimarDiasParaManutencao
     */
    static estimarDiasParaManutencao(veiculoId: string, kmAlvo: number, kmAtual: number): Promise<number | null>;
}
//# sourceMappingURL=PrevisaoService.d.ts.map