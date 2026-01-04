import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare class VeiculoController {
    /**
     * BUSCA DETALHES CONSOLIDADOS (Prontuário do Veículo)
     * Retorna dados cadastrais, métricas de custo e históricos recentes.
     */
    getDetalhes: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Cria um novo veículo e inicializa o histórico de KM via Transação.
     */
    create: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    list: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    update: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    delete: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=VeiculoController.d.ts.map