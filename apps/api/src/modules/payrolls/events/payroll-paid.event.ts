import { EventEmitter } from 'node:events';

export class PayrollPaidEvent {
  constructor(
    public readonly payrollId: string,
    public readonly employeeId: string,
    public readonly amount: number,
    public readonly periodStart: Date,
    public readonly periodEnd: Date,
    public readonly paidAt: Date,
  ) {}
}

export const payrollEvents = new EventEmitter();
