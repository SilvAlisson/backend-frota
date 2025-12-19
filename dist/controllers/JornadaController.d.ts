import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare class JornadaController {
    iniciar: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    finalizar: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    listarAbertas: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    listarMinhasAbertas: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    listarHistorico: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    verificarTimeouts: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    delete: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=JornadaController.d.ts.map