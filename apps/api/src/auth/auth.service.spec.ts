import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { SupabaseService } from '../database/supabase.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockSupabaseService = {
    getAdminClient: jest.fn(),
    getAnonClient: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, { provide: SupabaseService, useValue: mockSupabaseService }],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should reject duplicate email registration', async () => {
      mockSupabaseService.getAnonClient.mockReturnValue({
        auth: {
          signUp: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'User already registered' },
          }),
        },
      });

      await expect(
        service.register({ email: 'test@test.com', password: 'pass1234', displayName: 'Test' }),
      ).rejects.toThrow();
    });

    it('should reject invalid email format', async () => {
      await expect(
        service.register({ email: 'not-email', password: 'pass1234', displayName: 'Test' }),
      ).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should reject invalid credentials', async () => {
      mockSupabaseService.getAnonClient.mockReturnValue({
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: { message: 'Invalid login credentials' },
          }),
        },
      });

      await expect(service.login({ email: 'test@test.com', password: 'wrong' })).rejects.toThrow();
    });
  });
});
