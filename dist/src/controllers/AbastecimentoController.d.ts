import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare class AbastecimentoController {
    /**
     * Registra um novo abastecimento.
     */
    create: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Busca por ID.
     */
    getById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Atualização.
     */
    update: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    listRecent: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    delete: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=AbastecimentoController.d.ts.map