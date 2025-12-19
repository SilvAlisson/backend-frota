import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare class VeiculoController {
    /**
     * Cria um novo veículo.
     * Agora inclui 'marca' e inicializa 'kmAtual'.
     */
    create: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Lista veículos para a tabela.
     * O Prisma retorna as datas (vencimento) como ISO Strings, o que é perfeito para o Frontend.
     */
    list: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Busca veículo para Edição.
     * Formata as datas para YYYY-MM-DD para preencher os inputs date corretamente.
     */
    getById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    update: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    delete: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=VeiculoController.d.ts.map