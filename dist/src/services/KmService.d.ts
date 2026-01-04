export declare class KmService {
    static registrarKm(veiculoId: string, km: number, origem: 'JORNADA' | 'ABASTECIMENTO' | 'MANUTENCAO' | 'MANUAL', origemId?: string): Promise<void>;
    /**
     * Busca o MAIOR KM registrado para um veículo usando a tabela Otimizada (HistoricoKm).
     */
    static getUltimoKMRegistrado(veiculoId: string): Promise<number>;
}
//# sourceMappingURL=KmService.d.ts.map