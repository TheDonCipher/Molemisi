import { z } from 'zod';

// ============================================
// AUTH VALIDATION
// ============================================

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1, 'Display name is required').max(50, 'Display name too long'),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ============================================
// FARM VALIDATION
// ============================================

export const CreateFarmSchema = z.object({
  name: z.string().min(1, 'Farm name is required').max(100, 'Farm name too long'),
});

// ============================================
// CROP VALIDATION
// ============================================

export const PlantCropSchema = z.object({
  cropType: z.string().min(1, 'Crop type is required'),
  seedId: z.string().uuid('Invalid seed ID'),
});

export const WaterCropSchema = z.object({
  // No body needed - action is determined by the plot
});

export const HarvestCropSchema = z.object({
  // No body needed - action is determined by the plot
});

export const FertilizeCropSchema = z.object({
  fertilizerType: z.enum(['compost', 'manure', 'super_fertilizer']),
});

// ============================================
// LIVESTOCK VALIDATION
// ============================================

export const BuyAnimalSchema = z.object({
  animalType: z.string().min(1, 'Animal type is required'),
  name: z.string().max(50, 'Name too long').optional(),
});

export const FeedAnimalSchema = z.object({
  // No body needed - action is determined by the animal
});

export const CollectProductSchema = z.object({
  // No body needed - action is determined by the animal
});

export const HealAnimalSchema = z.object({
  medicineType: z.enum(['herbal_remedy', 'vet_kit']),
});

// ============================================
// BUILDING VALIDATION
// ============================================

export const ConstructBuildingSchema = z.object({
  buildingType: z.string().min(1, 'Building type is required'),
});

export const UpgradeBuildingSchema = z.object({
  // No body needed - action is determined by the building
});

// ============================================
// MARKET VALIDATION
// ============================================

export const SellItemSchema = z.object({
  itemType: z.string().min(1, 'Item type is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  quality: z.enum(['poor', 'normal', 'good', 'excellent']).default('normal'),
});

export const BuyItemSchema = z.object({
  itemType: z.string().min(1, 'Item type is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
});

// ============================================
// CONTRACT VALIDATION
// ============================================

export const AcceptContractSchema = z.object({
  // Contract ID comes from URL params
});

export const DeliverContractSchema = z.object({
  items: z.array(
    z.object({
      type: z.string().min(1),
      quantity: z.number().int().positive(),
    }),
  ).min(1, 'At least one item required'),
});

// ============================================
// TYPES
// ============================================

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateFarmInput = z.infer<typeof CreateFarmSchema>;
export type PlantCropInput = z.infer<typeof PlantCropSchema>;
export type BuyAnimalInput = z.infer<typeof BuyAnimalSchema>;
export type ConstructBuildingInput = z.infer<typeof ConstructBuildingSchema>;
export type SellItemInput = z.infer<typeof SellItemSchema>;
export type BuyItemInput = z.infer<typeof BuyItemSchema>;
export type DeliverContractInput = z.infer<typeof DeliverContractSchema>;
