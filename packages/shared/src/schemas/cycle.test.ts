import { describe, it, expect } from 'vitest';
import { canTransition, CYCLE_TRANSITIONS } from './cycle';
import { CycleStatus } from '../types';

describe('CYCLE_TRANSITIONS & canTransition', () => {
  it('allows valid transitions from PLANNED', () => {
    expect(canTransition(CycleStatus.PLANNED, CycleStatus.ACTIVE)).toBe(true);
    expect(canTransition(CycleStatus.PLANNED, CycleStatus.CANCELLED)).toBe(true);
    expect(canTransition(CycleStatus.PLANNED, CycleStatus.HARVESTING)).toBe(false);
    expect(canTransition(CycleStatus.PLANNED, CycleStatus.CLOSED)).toBe(false);
  });

  it('allows valid transitions from ACTIVE', () => {
    expect(canTransition(CycleStatus.ACTIVE, CycleStatus.HARVESTING)).toBe(true);
    expect(canTransition(CycleStatus.ACTIVE, CycleStatus.CANCELLED)).toBe(true);
    expect(canTransition(CycleStatus.ACTIVE, CycleStatus.PLANNED)).toBe(false);
    expect(canTransition(CycleStatus.ACTIVE, CycleStatus.CLOSED)).toBe(false);
  });

  it('allows valid transitions from HARVESTING', () => {
    expect(canTransition(CycleStatus.HARVESTING, CycleStatus.CLOSED)).toBe(true);
    expect(canTransition(CycleStatus.HARVESTING, CycleStatus.ACTIVE)).toBe(false);
    expect(canTransition(CycleStatus.HARVESTING, CycleStatus.CANCELLED)).toBe(false);
    expect(canTransition(CycleStatus.HARVESTING, CycleStatus.PLANNED)).toBe(false);
  });

  it('does not allow transitions from CLOSED or CANCELLED', () => {
    expect(CYCLE_TRANSITIONS[CycleStatus.CLOSED]).toEqual([]);
    expect(CYCLE_TRANSITIONS[CycleStatus.CANCELLED]).toEqual([]);

    for (const status of Object.values(CycleStatus)) {
      expect(canTransition(CycleStatus.CLOSED, status)).toBe(false);
      expect(canTransition(CycleStatus.CANCELLED, status)).toBe(false);
    }
  });
});
