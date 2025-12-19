import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare class PlanoManutencaoController {
    create: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    list: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    delete: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=PlanoManutencaoController.d.ts.map