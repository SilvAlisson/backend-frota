import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare class TreinamentoController {
    create: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    importar: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    listByUser: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    delete: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=TreinamentoController.d.ts.map