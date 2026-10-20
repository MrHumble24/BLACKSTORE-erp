import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;

  const mockHealthCheckService = {
    check: jest
      .fn()
      .mockImplementation((indicators: Array<() => Promise<unknown>>) => {
        return Promise.all(indicators.map((fn) => fn())).then(() => ({
          status: 'ok',
          info: { database: { status: 'up' } },
          error: {},
          details: { database: { status: 'up' } },
        }));
      }),
  };

  const mockPrismaHealthIndicator = {
    pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
  };

  const mockPrismaService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: PrismaHealthIndicator,
          useValue: mockPrismaHealthIndicator,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health check result', async () => {
    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(mockPrismaHealthIndicator.pingCheck).toHaveBeenCalledWith(
      'database',
      mockPrismaService,
    );
  });

  it('should return liveness status', () => {
    const result = controller.live();
    expect(result.status).toBe('ok');
    expect(typeof result.uptime).toBe('number');
  });
});
