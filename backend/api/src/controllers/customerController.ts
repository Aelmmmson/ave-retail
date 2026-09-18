import { Request, Response } from 'express';
import { prisma } from '../services/db';

export class CustomerController {
  // Get Customer Directory with Ledgers
  static async getCustomers(req: Request, res: Response) {
    try {
      const customers = await prisma.customer.findMany({ include: { ledgerEntries: true } });
      res.json({ success: true, data: customers });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // Create Store Credit Customer
  static async createCustomer(req: Request, res: Response) {
    try {
      const count = await prisma.customer.count();
      const customerNumber = `CUST-${(count + 1001).toString()}`;
      const customer = await prisma.customer.create({
        data: {
          customerNumber,
          name: req.body.name,
          phone: req.body.phone || null,
          email: req.body.email || null,
          address: req.body.address || null
        }
      });
      res.status(201).json({ success: true, data: customer });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}
