import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare class CargoController {
    create: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    list: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    delete: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    addRequisito: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    removeRequisito: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=CargoController.d.ts.map