import { Router } from 'express';
import { JornadaController } from '../controllers/JornadaController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
    iniciarJornadaSchema,
    finalizarJornadaSchema,
    buscaJornadaSchema
} from '../schemas/jornada.schemas';

const router = Router();
router.use(authenticateToken);

// Iniciar (Valida Body)
router.post('/iniciar', validate(iniciarJornadaSchema), JornadaController.iniciar);

// Finalizar (Valida ID no Params + Body)
router.put('/finalizar/:id', validate(finalizarJornadaSchema), JornadaController.finalizar);

// Buscas (Valida Query Params)
router.get('/historico', validate(buscaJornadaSchema), JornadaController.listarHistorico);

// Rotas sem validação complexa (apenas autenticação)
router.get('/abertas', JornadaController.listarAbertas);
router.get('/minhas-abertas-operador', JornadaController.listarMinhasAbertas);
router.post('/verificar-timeouts', JornadaController.verificarTimeouts);
router.delete('/:id', JornadaController.delete);

export default router;