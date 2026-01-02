"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrService = void 0;
const tesseract_js_1 = require("tesseract.js");
class OcrService {
    /**
     * Extrai números de uma imagem de odômetro.
     * Dica: Para alta performance, considere manter um pool de workers
     * ou usar uma API Cloud (Google Vision) se o volume for alto.
     */
    static async lerOdometro(imageUrl) {
        let worker;
        try {
            // Inicializa o worker com foco em dígitos
            worker = await (0, tesseract_js_1.createWorker)('eng'); // 'eng' costuma ser mais rápido para números
            await worker.setParameters({
                tessedit_char_whitelist: '0123456789', // Foco total em números
                tessedit_pageseg_mode: '7', // Modo "Single Line" (ideal para odômetros)
            });
            const { data: { text, confidence } } = await worker.recognize(imageUrl);
            // Filtro de confiança: Se o OCR estiver menos de 60% seguro, descartamos
            if (confidence < 60) {
                console.warn(`[OCR Low Confidence] ${confidence}% para imagem: ${imageUrl}`);
                return null;
            }
            // Remove espaços e caracteres residuais
            const apenasNumeros = text.replace(/[^0-9]/g, '');
            if (!apenasNumeros || apenasNumeros.length < 2)
                return null;
            return parseInt(apenasNumeros, 10);
        }
        catch (error) {
            console.error('[OCR Error] Falha ao processar imagem:', error);
            return null;
        }
        finally {
            if (worker)
                await worker.terminate();
        }
    }
}
exports.OcrService = OcrService;
//# sourceMappingURL=OcrService.js.map