import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare class FornecedorController {
    static create(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static list(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getById(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static update(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static delete(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=FornecedorController.d.ts.map