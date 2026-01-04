import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare class JornadaController {
    /**
     * INICIAR JORNADA
     * Inclui: Blindagem de motorista, Inteligência de Escala e Reconstituição de Inatividade
     */
    iniciar: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    /**
     * FINALIZAR JORNADA
     */
    finalizar: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    update: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    listarAbertas: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    listarMinhasAbertas: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    listarHistorico: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    delete: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    verificarTimeouts: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=JornadaController.d.ts.map