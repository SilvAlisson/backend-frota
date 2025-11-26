import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare class PlanoManutencaoController {
    static create(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static list(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static delete(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=PlanoManutencaoController.d.ts.map