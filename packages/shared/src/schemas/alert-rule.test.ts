import { describe, it, expect } from 'vitest';
import { createAlertRuleSchema, updateAlertRuleSchema, queryAlertRuleSchema } from './alert-rule';
import { AlertOp } from '../types';

describe('AlertRule schemas', () => {
  describe('createAlertRuleSchema', () => {
    it('validates a valid alert rule with defaults', () => {
      const payload = {
        sensorId: 'sensor-temp-1',
        op: AlertOp.GT,
        threshold: 38.5,
      };
      const parsed = createAlertRuleSchema.parse(payload);
      expect(parsed.sensorId).toBe('sensor-temp-1');
      expect(parsed.op).toBe(AlertOp.GT);
      expect(parsed.threshold).toBe(38.5);
      expect(parsed.isActive).toBe(true);
      expect(parsed.cooldownMinutes).toBe(30);
    });

    it('validates rule with LT operator and custom cooldown', () => {
      const payload = {
        sensorId: 'sensor-do-1',
        op: AlertOp.LT,
        threshold: 4.0,
        cooldownMinutes: 60,
        isActive: false,
      };
      const parsed = createAlertRuleSchema.parse(payload);
      expect(parsed.op).toBe(AlertOp.LT);
      expect(parsed.threshold).toBe(4.0);
      expect(parsed.cooldownMinutes).toBe(60);
      expect(parsed.isActive).toBe(false);
    });

    it('rejects missing sensorId or threshold', () => {
      expect(() => createAlertRuleSchema.parse({ op: AlertOp.GT, threshold: 10 })).toThrow();
      expect(() => createAlertRuleSchema.parse({ sensorId: 's1', op: AlertOp.GT })).toThrow();
    });

    it('rejects invalid cooldownMinutes', () => {
      expect(() =>
        createAlertRuleSchema.parse({
          sensorId: 's1',
          op: AlertOp.GT,
          threshold: 10,
          cooldownMinutes: 0,
        }),
      ).toThrow();
    });
  });

  describe('updateAlertRuleSchema', () => {
    it('allows partial update of threshold or cooldown', () => {
      const parsed = updateAlertRuleSchema.parse({
        threshold: 40,
        cooldownMinutes: 15,
      });
      expect(parsed.threshold).toBe(40);
      expect(parsed.cooldownMinutes).toBe(15);
      expect(parsed.sensorId).toBeUndefined();
    });
  });

  describe('queryAlertRuleSchema', () => {
    it('parses query filters', () => {
      const parsed = queryAlertRuleSchema.parse({
        sensorId: 's1',
        isActive: 'true',
        page: '1',
        pageSize: '10',
      });
      expect(parsed.sensorId).toBe('s1');
      expect(parsed.isActive).toBe(true);
      expect(parsed.page).toBe(1);
    });
  });
});
