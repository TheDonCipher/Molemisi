import {
  RegisterSchema,
  LoginSchema,
  PlantCropSchema,
  SellItemSchema,
  BuyItemSchema,
  CreateFarmSchema,
  FertilizeCropSchema,
  ConstructBuildingSchema,
  DeliverContractSchema,
} from './index';

describe('Validation Schemas', () => {
  // ========================================
  // RegisterSchema
  // ========================================
  describe('RegisterSchema', () => {
    it('accepts valid registration', () => {
      const result = RegisterSchema.safeParse({
        email: 'farmer@molemisi.co.bw',
        password: 'password123',
        displayName: 'Thabo',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = RegisterSchema.safeParse({
        email: 'not-an-email',
        password: 'password123',
        displayName: 'Thabo',
      });
      expect(result.success).toBe(false);
    });

    it('rejects short password', () => {
      const result = RegisterSchema.safeParse({
        email: 'farmer@molemisi.co.bw',
        password: '1234567',
        displayName: 'Thabo',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty display name', () => {
      const result = RegisterSchema.safeParse({
        email: 'farmer@molemisi.co.bw',
        password: 'password123',
        displayName: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing fields', () => {
      const result = RegisterSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  // ========================================
  // LoginSchema
  // ========================================
  describe('LoginSchema', () => {
    it('accepts valid login', () => {
      const result = LoginSchema.safeParse({
        email: 'farmer@molemisi.co.bw',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = LoginSchema.safeParse({
        email: 'bad',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty password', () => {
      const result = LoginSchema.safeParse({
        email: 'farmer@molemisi.co.bw',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });

  // ========================================
  // PlantCropSchema
  // ========================================
  describe('PlantCropSchema', () => {
    it('accepts valid plant input', () => {
      const result = PlantCropSchema.safeParse({
        cropType: 'sorghum',
        seedId: 'b340eb0a-ba19-47c5-9cee-4822f3a5c36a',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty cropType', () => {
      const result = PlantCropSchema.safeParse({
        cropType: '',
        seedId: 'b340eb0a-ba19-47c5-9cee-4822f3a5c36a',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid seed UUID', () => {
      const result = PlantCropSchema.safeParse({
        cropType: 'sorghum',
        seedId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing seedId', () => {
      const result = PlantCropSchema.safeParse({
        cropType: 'sorghum',
      });
      expect(result.success).toBe(false);
    });
  });

  // ========================================
  // SellItemSchema
  // ========================================
  describe('SellItemSchema', () => {
    it('accepts valid sell input', () => {
      const result = SellItemSchema.safeParse({
        itemType: 'sorghum',
        quantity: 5,
      });
      expect(result.success).toBe(true);
    });

    it('defaults quality to normal', () => {
      const result = SellItemSchema.safeParse({
        itemType: 'sorghum',
        quantity: 5,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quality).toBe('normal');
      }
    });

    it('accepts valid quality values', () => {
      for (const quality of ['poor', 'normal', 'good', 'excellent']) {
        const result = SellItemSchema.safeParse({
          itemType: 'sorghum',
          quantity: 1,
          quality,
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects negative quantity', () => {
      const result = SellItemSchema.safeParse({
        itemType: 'sorghum',
        quantity: -1,
      });
      expect(result.success).toBe(false);
    });

    it('rejects zero quantity', () => {
      const result = SellItemSchema.safeParse({
        itemType: 'sorghum',
        quantity: 0,
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-integer quantity', () => {
      const result = SellItemSchema.safeParse({
        itemType: 'sorghum',
        quantity: 1.5,
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid quality', () => {
      const result = SellItemSchema.safeParse({
        itemType: 'sorghum',
        quantity: 1,
        quality: 'legendary',
      });
      expect(result.success).toBe(false);
    });
  });

  // ========================================
  // BuyItemSchema
  // ========================================
  describe('BuyItemSchema', () => {
    it('accepts valid buy input', () => {
      const result = BuyItemSchema.safeParse({
        itemType: 'sorghum_seed',
        quantity: 10,
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty itemType', () => {
      const result = BuyItemSchema.safeParse({
        itemType: '',
        quantity: 1,
      });
      expect(result.success).toBe(false);
    });

    it('rejects zero quantity', () => {
      const result = BuyItemSchema.safeParse({
        itemType: 'sorghum_seed',
        quantity: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  // ========================================
  // CreateFarmSchema
  // ========================================
  describe('CreateFarmSchema', () => {
    it('accepts valid farm name', () => {
      const result = CreateFarmSchema.safeParse({ name: 'Thabo Farm' });
      expect(result.success).toBe(true);
    });

    it('rejects empty name', () => {
      const result = CreateFarmSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });
  });

  // ========================================
  // DeliverContractSchema
  // ========================================
  describe('DeliverContractSchema', () => {
    it('accepts valid delivery', () => {
      const result = DeliverContractSchema.safeParse({
        items: [{ type: 'sorghum', quantity: 10 }],
      });
      expect(result.success).toBe(true);
    });

    it('accepts multiple items', () => {
      const result = DeliverContractSchema.safeParse({
        items: [
          { type: 'sorghum', quantity: 10 },
          { type: 'maize', quantity: 5 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty items array', () => {
      const result = DeliverContractSchema.safeParse({
        items: [],
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative quantity in items', () => {
      const result = DeliverContractSchema.safeParse({
        items: [{ type: 'sorghum', quantity: -5 }],
      });
      expect(result.success).toBe(false);
    });
  });

  // ========================================
  // FertilizeCropSchema
  // ========================================
  describe('FertilizeCropSchema', () => {
    it('accepts compost', () => {
      const result = FertilizeCropSchema.safeParse({ fertilizerType: 'compost' });
      expect(result.success).toBe(true);
    });

    it('accepts manure', () => {
      const result = FertilizeCropSchema.safeParse({ fertilizerType: 'manure' });
      expect(result.success).toBe(true);
    });

    it('accepts super_fertilizer', () => {
      const result = FertilizeCropSchema.safeParse({ fertilizerType: 'super_fertilizer' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid fertilizer', () => {
      const result = FertilizeCropSchema.safeParse({ fertilizerType: 'chemical' });
      expect(result.success).toBe(false);
    });
  });

  // ========================================
  // ConstructBuildingSchema
  // ========================================
  describe('ConstructBuildingSchema', () => {
    it('accepts valid building type', () => {
      const result = ConstructBuildingSchema.safeParse({ buildingType: 'coop' });
      expect(result.success).toBe(true);
    });

    it('rejects empty building type', () => {
      const result = ConstructBuildingSchema.safeParse({ buildingType: '' });
      expect(result.success).toBe(false);
    });
  });
});
