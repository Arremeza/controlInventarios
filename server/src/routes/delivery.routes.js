import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.js'
import { updateDelivery } from '../controllers/delivery.controller.js'

const router = Router()

router.use(authenticate, authorize(['admin']))
router.put('/:id', updateDelivery)

export default router


