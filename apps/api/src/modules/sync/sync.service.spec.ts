import { Role, ActivityType, parseActivityData, type CreateActivityInput } from '@xfarm/shared';
import { SyncService } from './sync.service';
import type { ActivitiesService } from '../activities/activities.service';
import type { AttendanceService } from '../attendance/attendance.service';
import type { TasksService } from '../tasks/tasks.service';

jest.mock('@xfarm/db', () => ({
  prisma: {
    auditLog: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    activity: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    attendance: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    task: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
  Prisma: {
    PrismaClientKnownRequestError: class extends Error {
      code: string;
      constructor(message: string, code: string) {
        super(message);
        this.code = code;
      }
    },
  },
}));

import { prisma } from '@xfarm/db';

describe('SyncService', () => {
  let syncService: SyncService;
  let mockActivitiesService: { create: jest.Mock };
  let mockAttendanceService: { checkIn: jest.Mock; checkOut: jest.Mock };
  let mockTasksService: { complete: jest.Mock };

  const mockUser = {
    id: 'user-worker-1',
    role: Role.WORKER,
    employeeId: 'emp-1',
    email: 'worker@xfarm.local',
    fullName: 'Worker One',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockActivitiesService = {
      create: jest.fn().mockImplementation(async (dto: CreateActivityInput) => {
        // Thực hiện validate data theo đúng hợp đồng nghiệp vụ của ActivitiesService
        parseActivityData(dto.type, dto.data);
        return { id: 'act-created-1' };
      }),
    };

    mockAttendanceService = {
      checkIn: jest.fn(),
      checkOut: jest.fn(),
    };

    mockTasksService = {
      complete: jest.fn(),
    };

    syncService = new SyncService(
      mockActivitiesService as unknown as ActivitiesService,
      mockAttendanceService as unknown as AttendanceService,
      mockTasksService as unknown as TasksService,
    );

    (prisma.auditLog.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.activity.findUnique as jest.Mock).mockResolvedValue(null);
  });

  describe('Validation nghiệp vụ hoạt động canh tác khi đồng bộ', () => {
    it('item IRRIGATION thiếu durationMin -> kết quả error và không tạo activity', async () => {
      const clientId = 'sync-irrigation-missing-duration';
      const results = await syncService.syncBatch(
        {
          items: [
            {
              clientId,
              kind: 'activity',
              payload: {
                areaId: 'area-1',
                type: ActivityType.IRRIGATION,
                data: {
                  volumeL: 50, // Có thể tích nước nhưng thiếu durationMin bắt buộc
                },
              },
              createdAt: new Date(),
            },
          ],
        },
        mockUser,
      );

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('error');
      expect(results[0].clientId).toBe(clientId);
      expect(results[0].error).toBeDefined();

      // Xác nhận không tạo activity mới và không ghi nhận audit log thành công
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('item IRRIGATION có đầy đủ durationMin -> kết quả created', async () => {
      const clientId = 'sync-irrigation-valid';
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: 'audit-1' });

      const results = await syncService.syncBatch(
        {
          items: [
            {
              clientId,
              kind: 'activity',
              payload: {
                areaId: 'area-1',
                type: ActivityType.IRRIGATION,
                data: {
                  durationMin: 20,
                  volumeL: 100,
                },
              },
              createdAt: new Date(),
            },
          ],
        },
        mockUser,
      );

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        clientId,
        status: 'created',
        id: 'act-created-1',
      });
      expect(mockActivitiesService.create).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });
});
