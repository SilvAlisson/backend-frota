import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare class JornadaController {
    static iniciar(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static finalizar(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static listarAbertas(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static listarMinhasAbertas(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=JornadaController.d.ts.map