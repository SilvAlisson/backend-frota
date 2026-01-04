"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrService = void 0;
const tesseract_js_1 = require("tesseract.js");
class OcrService {
    static async lerOdometro(imageUrl) {
        let worker;
        try {
            worker = await (0, tesseract_js_1.createWorker)('eng');
            await worker.setParameters({
                tessedit_char_whitelist: '0123456789',
                tessedit_pageseg_mode: '7',
            });
            const { data: { text, confidence } } = await worker.recognize(imageUrl);
            if (confidence < 60) {
                console.warn(`[OCR Low Confidence] ${confidence}% para imagem: ${imageUrl}`);
                return null;
            }
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