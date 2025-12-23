import { Router } from 'express';
import { JornadaController } from '../controllers/JornadaController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
    iniciarJornadaSchema,
    finalizarJornadaSchema,
    buscaJornadaSchema,
    editarJornadaSchema
} from '../schemas/jornada.schemas';

const router = Router();
const jornadaController = new JornadaController();

router.use(authenticateToken);

// Iniciar e Finalizar
router.post('/iniciar', validate(iniciarJornadaSchema), jornadaController.iniciar);
router.put('/finalizar/:id', validate(finalizarJornadaSchema), jornadaController.finalizar);

// --- NOVA ROTA DE EDIÇÃO ---
router.put('/:id', validate(editarJornadaSchema), jornadaController.update);

// Buscas e Delete
router.get('/historico', validate(buscaJornadaSchema), jornadaController.listarHistorico);
router.get('/abertas', jornadaController.listarAbertas);
router.get('/minhas-abertas-operador', jornadaController.listarMinhasAbertas);
router.post('/verificar-timeouts', jornadaController.verificarTimeouts);
router.delete('/:id', jornadaController.delete);

export default router;