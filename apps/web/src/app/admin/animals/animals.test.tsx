import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import {
  AnimalSex,
  AnimalStatus,
  AnimalEventType,
  Role,
  getAllowedEventTypes,
  canManageAnimals,
  canRecordAnyEvent,
  ANIMAL_SEX_LABELS,
  ANIMAL_STATUS_LABELS,
  ANIMAL_EVENT_TYPE_LABELS,
  type AnimalItem,
} from './types';
import { AnimalStatusBadge } from './animal-status-badge';
import { EventForm } from './event-dialog';

describe('Animal Management Unit & Component Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockAnimal: AnimalItem = {
    id: 'animal-1',
    tag: 'VN-BO-001',
    groupId: 'group-1',
    species: 'Bò',
    breed: 'Bò sữa Hà Lan',
    sex: AnimalSex.FEMALE,
    birthDate: '2025-01-15T00:00:00.000Z',
    status: AnimalStatus.ALIVE,
    motherId: null,
    notes: 'Khỏe mạnh',
    createdAt: '2025-01-15T00:00:00.000Z',
    updatedAt: '2025-01-15T00:00:00.000Z',
  };

  describe('Phân quyền theo vai trò (Roles & Permissions)', () => {
    it('WORKER chỉ được phép ghi các sự kiện VACCINATION, TREATMENT, WEIGHING', () => {
      const workerTypes = getAllowedEventTypes(Role.WORKER);
      expect(workerTypes).toEqual([
        AnimalEventType.VACCINATION,
        AnimalEventType.TREATMENT,
        AnimalEventType.WEIGHING,
      ]);
    });

    it('WORKER KHÔNG thấy và KHÔNG có quyền sự kiện SALE (xuất bán)', () => {
      const workerTypes = getAllowedEventTypes(Role.WORKER);
      expect(workerTypes.includes(AnimalEventType.SALE)).toBe(false);
      expect(workerTypes).not.toContain(AnimalEventType.SALE);
    });

    it('WORKER KHÔNG có quyền sự kiện DEATH, BREEDING, BIRTH', () => {
      const workerTypes = getAllowedEventTypes(Role.WORKER);
      expect(workerTypes).not.toContain(AnimalEventType.DEATH);
      expect(workerTypes).not.toContain(AnimalEventType.BREEDING);
      expect(workerTypes).not.toContain(AnimalEventType.BIRTH);
    });

    it('OWNER và MANAGER có toàn quyền trên tất cả các loại sự kiện bao gồm SALE', () => {
      const ownerTypes = getAllowedEventTypes(Role.OWNER);
      const managerTypes = getAllowedEventTypes(Role.MANAGER);

      expect(ownerTypes).toContain(AnimalEventType.SALE);
      expect(ownerTypes).toContain(AnimalEventType.BIRTH);
      expect(ownerTypes).toContain(AnimalEventType.DEATH);
      expect(ownerTypes).toHaveLength(7);

      expect(managerTypes).toContain(AnimalEventType.SALE);
      expect(managerTypes).toHaveLength(7);
    });

    it('canManageAnimals chỉ cho phép OWNER và MANAGER tạo/sửa đàn và cá thể', () => {
      expect(canManageAnimals(Role.OWNER)).toBe(true);
      expect(canManageAnimals(Role.MANAGER)).toBe(true);
      expect(canManageAnimals(Role.WORKER)).toBe(false);
      expect(canManageAnimals(Role.ACCOUNTANT)).toBe(false);
      expect(canManageAnimals(Role.SALES)).toBe(false);
      expect(canManageAnimals(null)).toBe(false);
    });

    it('canRecordAnyEvent cho phép WORKER, OWNER, MANAGER ghi sự kiện', () => {
      expect(canRecordAnyEvent(Role.WORKER)).toBe(true);
      expect(canRecordAnyEvent(Role.MANAGER)).toBe(true);
      expect(canRecordAnyEvent(Role.OWNER)).toBe(true);
      expect(canRecordAnyEvent(Role.ACCOUNTANT)).toBe(false);
      expect(canRecordAnyEvent(Role.SALES)).toBe(false);
    });
  });

  describe('Hiển thị bảng và trạng thái (DataTable & StatusBadge)', () => {
    it('AnimalStatusBadge hiển thị đúng nhãn và variant theo AnimalStatus', () => {
      const aliveHtml = renderToString(<AnimalStatusBadge status={AnimalStatus.ALIVE} />);
      expect(aliveHtml).toContain(ANIMAL_STATUS_LABELS[AnimalStatus.ALIVE]); // 'Còn sống'

      const soldHtml = renderToString(<AnimalStatusBadge status={AnimalStatus.SOLD} />);
      expect(soldHtml).toContain(ANIMAL_STATUS_LABELS[AnimalStatus.SOLD]); // 'Đã bán'

      const deadHtml = renderToString(<AnimalStatusBadge status={AnimalStatus.DEAD} />);
      expect(deadHtml).toContain(ANIMAL_STATUS_LABELS[AnimalStatus.DEAD]); // 'Đã chết'
    });

    it('Labels hiển thị đúng tiếng Việt cho giới tính và loại sự kiện', () => {
      expect(ANIMAL_SEX_LABELS[AnimalSex.MALE]).toBe('Đực');
      expect(ANIMAL_SEX_LABELS[AnimalSex.FEMALE]).toBe('Cái');
      expect(ANIMAL_SEX_LABELS[AnimalSex.UNKNOWN]).toBe('Chưa rõ');

      expect(ANIMAL_EVENT_TYPE_LABELS[AnimalEventType.VACCINATION]).toBe('Tiêm phòng');
      expect(ANIMAL_EVENT_TYPE_LABELS[AnimalEventType.TREATMENT]).toBe('Điều trị / Dùng thuốc');
      expect(ANIMAL_EVENT_TYPE_LABELS[AnimalEventType.WEIGHING]).toBe('Cân trọng lượng');
      expect(ANIMAL_EVENT_TYPE_LABELS[AnimalEventType.BIRTH]).toBe('Sinh sản');
      expect(ANIMAL_EVENT_TYPE_LABELS[AnimalEventType.SALE]).toBe('Xuất bán');
      expect(ANIMAL_EVENT_TYPE_LABELS[AnimalEventType.DEATH]).toBe('Khai tử');
      expect(ANIMAL_EVENT_TYPE_LABELS[AnimalEventType.BREEDING]).toBe('Phối giống');
    });

    it('Lọc cá thể mẹ chỉ chọn con cái (sex === FEMALE)', () => {
      const animalList: AnimalItem[] = [
        { ...mockAnimal, id: '1', tag: 'COW-F1', sex: AnimalSex.FEMALE },
        { ...mockAnimal, id: '2', tag: 'BULL-M1', sex: AnimalSex.MALE },
        { ...mockAnimal, id: '3', tag: 'CALF-U1', sex: AnimalSex.UNKNOWN },
        { ...mockAnimal, id: '4', tag: 'COW-F2', sex: AnimalSex.FEMALE },
      ];

      const femaleMothers = animalList.filter((a) => a.sex === AnimalSex.FEMALE);
      expect(femaleMothers).toHaveLength(2);
      expect(femaleMothers.map((m) => m.tag)).toEqual(['COW-F1', 'COW-F2']);
      expect(femaleMothers.every((m) => m.sex === AnimalSex.FEMALE)).toBe(true);
    });
  });

  describe('Form sự kiện đổi trường theo loại (Dynamic Event Form)', () => {
    it('WORKER khi mở EventForm không thể kích hoạt form SALE (luôn fallback về VACCINATION)', () => {
      const html = renderToString(
        <EventForm
          animal={mockAnimal}
          userRole={Role.WORKER}
          initialEventType={AnimalEventType.SALE}
          onSuccess={vi.fn()}
        />,
      );

      // WORKER không được phép dùng SALE, form không render fields-sale
      expect(html).not.toContain('data-testid="fields-sale"');
      expect(html).not.toContain('Giá bán (VNĐ)');

      // Tự động fallback về sự kiện đầu tiên được phép (VACCINATION)
      expect(html).toContain('data-testid="fields-vaccination"');
      expect(html).toContain('Thông tin tiêm phòng');
    });

    it('OWNER/MANAGER khi mở EventForm có thể mở form SALE đầy đủ', () => {
      const html = renderToString(
        <EventForm
          animal={mockAnimal}
          userRole={Role.OWNER}
          initialEventType={AnimalEventType.SALE}
          onSuccess={vi.fn()}
        />,
      );

      // OWNER có quyền mở form SALE
      expect(html).toContain('data-testid="fields-sale"');
      expect(html).toContain('Giá bán (VNĐ)');
      expect(html).toContain('Trọng lượng xuất bán (kg)');
      expect(html).toContain('Người mua / Thương lái');
    });

    it('Sự kiện VACCINATION hiển thị các trường Tên vắc-xin, Liều lượng, Bệnh phòng ngừa', () => {
      const html = renderToString(
        <EventForm
          animal={mockAnimal}
          userRole={Role.OWNER}
          initialEventType={AnimalEventType.VACCINATION}
          onSuccess={vi.fn()}
        />,
      );

      expect(html).toContain('Thông tin tiêm phòng');
      expect(html).toContain('Tên vắc-xin *');
      expect(html).toContain('Liều lượng');
      expect(html).toContain('Bệnh phòng ngừa');
    });

    it('Sự kiện TREATMENT hiển thị các trường Tên thuốc, Liều dùng, Chẩn đoán', () => {
      const html = renderToString(
        <EventForm
          animal={mockAnimal}
          userRole={Role.OWNER}
          initialEventType={AnimalEventType.TREATMENT}
          onSuccess={vi.fn()}
        />,
      );

      expect(html).toContain('Thông tin điều trị &amp; Dùng thuốc');
      expect(html).toContain('Tên thuốc / Phác đồ *');
      expect(html).toContain('Liều dùng');
      expect(html).toContain('Chẩn đoán / Bệnh');
    });

    it('Sự kiện WEIGHING hiển thị trường Trọng lượng (kg)', () => {
      const html = renderToString(
        <EventForm
          animal={mockAnimal}
          userRole={Role.OWNER}
          initialEventType={AnimalEventType.WEIGHING}
          onSuccess={vi.fn()}
        />,
      );

      expect(html).toContain('Cân trọng lượng');
      expect(html).toContain('Trọng lượng (kg) *');
    });

    it('Sự kiện BIRTH hiển thị danh sách con non và nút Thêm con non', () => {
      const html = renderToString(
        <EventForm
          animal={mockAnimal}
          userRole={Role.OWNER}
          initialEventType={AnimalEventType.BIRTH}
          onSuccess={vi.fn()}
        />,
      );

      expect(html).toContain('Danh sách con non sinh ra');
      expect(html).toContain('Mã tai / Thẻ *');
      expect(html).toContain('Thêm con non');
    });

    it('Sự kiện SALE hiển thị các trường Giá bán, Trọng lượng xuất bán, Người mua', () => {
      const html = renderToString(
        <EventForm
          animal={mockAnimal}
          userRole={Role.OWNER}
          initialEventType={AnimalEventType.SALE}
          onSuccess={vi.fn()}
        />,
      );

      expect(html).toContain('Giá bán (VNĐ)');
      expect(html).toContain('Trọng lượng xuất bán (kg)');
      expect(html).toContain('Người mua / Thương lái');
    });

    it('Sự kiện DEATH hiển thị trường Nguyên nhân chết và cảnh báo chuyển trạng thái', () => {
      const html = renderToString(
        <EventForm
          animal={mockAnimal}
          userRole={Role.OWNER}
          initialEventType={AnimalEventType.DEATH}
          onSuccess={vi.fn()}
        />,
      );

      expect(html).toContain('Nguyên nhân chết *');
      expect(html).toContain('ĐÃ CHẾT');
    });
  });
});
