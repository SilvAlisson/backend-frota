import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare class RelatorioController {
    /**
     * EVOLUÇÃO DE KM (Para Gráficos)
     * Busca a progressão do odômetro do veículo nos últimos X dias.
     */
    getEvolucaoKm: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * SUMÁRIO EXECUTIVO (KPIs)
     * Consolida custos de combustível, aditivos, manutenção e eficiência.
     */
    sumario: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    /**
     * RANKING DE OPERADORES
     * Calcula eficiência (KM/L) individual por motorista.
     */
    ranking: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    /**
     * ALERTAS GERAIS (Documentação e Previsão Inteligente de Manutenção)
     */
    alertas: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    /**
     * RELATÓRIO DE LAVAGENS
     * Histórico e resumo financeiro anual de lavagens.
     */
    getRelatorioLavagens: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=RelatorioController.d.ts.map