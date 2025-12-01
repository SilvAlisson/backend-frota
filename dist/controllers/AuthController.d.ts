import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare class AuthController {
    static login(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static loginWithToken(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static generateToken(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=AuthController.d.ts.map