import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare class RelatorioController {
    sumario: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    ranking: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    alertas: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=RelatorioController.d.ts.map