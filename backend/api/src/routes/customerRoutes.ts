import { Router } from 'express';
import { CustomerController } from '../controllers/customerController';

export const customerRouter = Router();

customerRouter.get('/', CustomerController.getCustomers);
customerRouter.post('/', CustomerController.createCustomer);
