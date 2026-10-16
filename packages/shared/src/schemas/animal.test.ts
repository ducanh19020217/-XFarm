import { describe, expect, it } from 'vitest';
import { AnimalEventType, AnimalSex, AnimalStatus } from '../types';
import { createAnimalEventSchema, createAnimalGroupSchema, createAnimalSchema } from './animal';

describe('Animal schemas', () => {
  describe('createAnimalGroupSchema', () => {
    it('validates a valid animal group input', () => {
      const data = {
        cycleId: 'cycle-1',
        species: 'Bò',
        areaId: 'area-1',
        headCount: 20,
      };
      const parsed = createAnimalGroupSchema.parse(data);
      expect(parsed.species).toBe('Bò');
      expect(parsed.headCount).toBe(20);
    });

    it('defaults headCount to 0', () => {
      const data = {
        cycleId: 'cycle-1',
        species: 'Gà',
        areaId: 'area-1',
      };
      const parsed = createAnimalGroupSchema.parse(data);
      expect(parsed.headCount).toBe(0);
    });

    it('rejects negative headCount', () => {
      expect(() =>
        createAnimalGroupSchema.parse({
          cycleId: 'cycle-1',
          species: 'Gà',
          areaId: 'area-1',
          headCount: -5,
        }),
      ).toThrow();
    });
  });

  describe('createAnimalSchema', () => {
    it('validates animal creation with defaults', () => {
      const data = {
        tag: 'COW-001',
        species: 'Bò sữa',
      };
      const parsed = createAnimalSchema.parse(data);
      expect(parsed.tag).toBe('COW-001');
      expect(parsed.sex).toBe(AnimalSex.UNKNOWN);
      expect(parsed.status).toBe(AnimalStatus.ALIVE);
    });
  });

  describe('createAnimalEventSchema', () => {
    it('validates animal event with offspring', () => {
      const data = {
        type: AnimalEventType.BIRTH,
        offspring: [
          { tag: 'CALF-01', sex: AnimalSex.FEMALE },
          { tag: 'CALF-02', sex: AnimalSex.MALE },
        ],
      };
      const parsed = createAnimalEventSchema.parse(data);
      expect(parsed.type).toBe(AnimalEventType.BIRTH);
      expect(parsed.offspring).toHaveLength(2);
      expect(parsed.offspring?.[0]?.tag).toBe('CALF-01');
    });
  });
});
