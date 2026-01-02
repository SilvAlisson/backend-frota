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
const jornadaController = new JornadaController();

router.use(authenticateToken);

// Iniciar (Valida Body)
// <--- 2. Uso da instância
router.post('/iniciar', validate(iniciarJornadaSchema), jornadaController.iniciar);

// Finalizar (Valida ID no Params + Body)
router.put('/finalizar/:id', validate(finalizarJornadaSchema), jornadaController.finalizar);

// Buscas (Valida Query Params)
router.get('/historico', validate(buscaJornadaSchema), jornadaController.listarHistorico);

// Rotas sem validação complexa (apenas autenticação)
router.get('/abertas', jornadaController.listarAbertas);
router.get('/minhas-abertas-operador', jornadaController.listarMinhasAbertas);
router.post('/verificar-timeouts', jornadaController.verificarTimeouts);
router.delete('/:id', jornadaController.delete);

export default router;