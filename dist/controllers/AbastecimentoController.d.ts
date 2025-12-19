import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare class AbastecimentoController {
    /**
     * Registra um novo abastecimento.
     * Inclui validação de tipo de combustível (Blindagem) e auditoria de KM.
     */
    create: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Lista abastecimentos recentes com filtros.
     */
    listRecent: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Remove um abastecimento e seus itens (Transação).
     */
    delete: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=AbastecimentoController.d.ts.map