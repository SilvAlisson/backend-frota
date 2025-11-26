import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare class AbastecimentoController {
    static create(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static listRecent(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static delete(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=AbastecimentoController.d.ts.map