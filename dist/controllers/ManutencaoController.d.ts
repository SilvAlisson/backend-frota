import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare class ManutencaoController {
    static create(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static update(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static listRecent(req: Request, res: Response): Promise<void>;
    static delete(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=ManutencaoController.d.ts.map