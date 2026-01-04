export declare class OcrService {
    /**
     * Extrai números de uma imagem de odômetro.
     * Dica: Para alta performance, considere manter um pool de workers
     * ou usar uma API Cloud (Google Vision) se o volume for alto.
     */
    static lerOdometro(imageUrl: string): Promise<number | null>;
}
//# sourceMappingURL=OcrService.d.ts.map