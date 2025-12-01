import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare class CargoController {
    static create(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static list(req: AuthenticatedRequest, res: Response): Promise<void>;
    static delete(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static addRequisito(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static removeRequisito(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=CargoController.d.ts.map