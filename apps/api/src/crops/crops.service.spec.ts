import { Test, TestingModule } from '@nestjs/testing';
import { CropsService } from './crops.service';
import { SupabaseService } from '../database/supabase.service';

describe('CropsService', () => {
  let service: CropsService;

  const mockSupabaseService = {
    getAdminClient: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CropsService,
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    service = module.get<CropsService>(CropsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('plantCrop', () => {
    it('should throw if plot not found', async () => {
      mockSupabaseService.getAdminClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        }),
      });

      await expect(
        service.plantCrop('farm-1', 'plot-1', 'user-1', 'sorghum', 'seed-1'),
      ).rejects.toThrow('Plot not found');
    });
  });
});
