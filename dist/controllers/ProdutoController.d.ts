import { AuthenticatedRequest } from '../middleware/auth';
import { Response } from 'express';
export declare class ProdutoController {
    static create(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static list(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getById(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static update(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static delete(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=ProdutoController.d.ts.map