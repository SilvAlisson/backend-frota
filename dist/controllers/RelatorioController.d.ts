import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare class RelatorioController {
    static sumario(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static ranking(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static alertas(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=RelatorioController.d.ts.map