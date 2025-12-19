export declare class JornadaService {
    /**
     * Verifica todas as jornadas abertas há mais de 17h e fecha automaticamente.
     * Otimizado para executar diretamente no Banco de Dados (sem loop em memória).
     */
    static fecharJornadasVencidas(): Promise<void>;
}
//# sourceMappingURL=JornadaService.d.ts.map