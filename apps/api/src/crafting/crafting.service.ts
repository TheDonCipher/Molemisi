import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { InventoryService } from '../inventory/inventory.service';
import { WalletService } from '../wallet/wallet.service';
import {
  RECIPES,
  RECIPE_SLUGS,
  BATCH_SIZES,
  batchFee,
  defaultInputsFor,
  recipeEconomics,
  BONUS_YIELD_CHANCE,
  type RecipeDef,
  type BatchSize,
  type RecipeEconomics,
  craftingSlotsFor,
} from '@molemisi/game-config';

export interface RecipeView {
  slug: string;
  name: string;
  setswana: string;
  outputSlug: string;
  outputQty: number;
  inputs: { anyOf: string[]; qty: number }[];
  feePula: number;
  /** Fee for each legal batch. Sent down so the client never computes money (I7). */
  batchFees: Record<BatchSize, number>;
  durationMinutes: number;
  unlock: { bothoGte: number } | null;
  isUnlocked: boolean;
  economics: RecipeEconomics;
}

export interface ActiveJobView {
  id: string;
  recipeSlug: string;
  qty: BatchSize;
  slotIndex: number;
  startedAt: string;
  readyAt: string;
  collected: boolean;
}

export interface CollectResult {
  recipeSlug: string;
  outputSlug: string;
  quantity: number;
  bonus: boolean;
  overflow: number;
}

@Injectable()
export class CraftingService {
  constructor(
    private supabaseService: SupabaseService,
    private inventory: InventoryService,
    private wallet: WalletService,
  ) {}

  private client() {
    return this.supabaseService.getAdminClient();
  }

  /** GET /recipes — filtered server-side by Botho unlock (I4 / 02 §6.4). */
  async getRecipes(playerId: string): Promise<RecipeView[]> {
    const botho = await this.wallet.getBotho(playerId);
    const owned = await this.inventory.ownedMap(playerId);

    const feesFor = (recipe: RecipeDef) => {
      const out = {} as Record<BatchSize, number>;
      for (const b of BATCH_SIZES) out[b] = batchFee(recipe, b);
      return out;
    };

    return RECIPE_SLUGS.map((slug) => {
      const recipe = RECIPES[slug];
      const unlocked = !recipe.unlock || botho >= recipe.unlock.bothoGte;
      const chosen = defaultInputsFor(recipe, owned);
      return {
        slug,
        name: recipe.name,
        setswana: recipe.setswana,
        outputSlug: recipe.output,
        outputQty: recipe.outputQty,
        inputs: recipe.inputs,
        feePula: recipe.feePula,
        batchFees: feesFor(recipe),
        durationMinutes: recipe.durationMinutes,
        unlock: recipe.unlock,
        isUnlocked: unlocked,
        economics: recipeEconomics(recipe, chosen, 1),
      };
    });
  }

  /** How many concurrent slots the player has (workshop building tier). */
  async unlockedSlots(farmId: string): Promise<number> {
    const { data } = await this.client()
      .from('buildings')
      .select('level')
      .eq('farm_id', farmId)
      .eq('building_type', 'crafting')
      .single();
    return craftingSlotsFor((data?.level as number) || 1);
  }

  async listJobs(playerId: string): Promise<ActiveJobView[]> {
    const { data, error } = await this.client()
      .from('crafting_jobs')
      .select('id, recipe_id, slot_index, qty, started_at, collected_at')
      .eq('player_id', playerId);
    if (error) throw new Error('Failed to fetch crafting jobs');

    const recipes = await this.client().from('crafting_recipes').select('id, slug, duration_minutes');
    const durById = new Map<string, number>();
    for (const r of recipes.data ?? []) durById.set(r.id as string, r.duration_minutes as number);

    return (data ?? []).map((row: Record<string, unknown>) => {
      const recipeSlug = durById.has(row.recipe_id as string)
        ? (recipes.data!.find((r) => r.id === row.recipe_id)!.slug as string)
        : '';
      const dur = durById.get(row.recipe_id as string) ?? 0;
      const started = new Date(row.started_at as string);
      const ready = new Date(started.getTime() + dur * 60_000);
      return {
        id: row.id as string,
        recipeSlug,
        qty: row.qty as BatchSize,
        slotIndex: row.slot_index as number,
        startedAt: started.toISOString(),
        readyAt: ready.toISOString(),
        collected: row.collected_at != null,
      };
    });
  }

  /**
   * POST /start. Validates unlock, batch size, substitution inputs, inputs owned,
   * fee affordability and a free slot — ALL before mutating anything, so a rejected
   * craft never deducts inputs or fee (05 §P3 "rejects on missing inputs OR
   * unaffordable fee with no partial deduction").
   */
  async startCraft(
    playerId: string,
    farmId: string,
    recipeSlug: string,
    qty: number,
    chosenInputs?: Record<string, number>,
  ): Promise<{ jobId: string; slotIndex: number; readyAt: string; fee: number }> {
    const recipe = RECIPES[recipeSlug as keyof typeof RECIPES];
    if (!recipe) throw new BadRequestException(`Unknown recipe: ${recipeSlug}`);

    // Botho gate — Bupi/Borotho require Botho >= 100 (02 §6.4).
    if (recipe.unlock) {
      const botho = await this.wallet.getBotho(playerId);
      if (botho < recipe.unlock.bothoGte) {
        throw new BadRequestException(`Requires Botho ${recipe.unlock.bothoGte} to unlock`);
      }
    }

    if (!BATCH_SIZES.includes(qty as BatchSize)) {
      throw new BadRequestException('Batch size must be 1, 3 or 6');
    }
    const batch = qty as BatchSize;

    // Resolve + validate substitution.
    //
    // `chosenInputs` (and `defaultInputsFor`) are expressed PER UNIT — "2 clay per
    // brick" — so they must be scaled by the batch before anything is consumed.
    // Output already scales (`outputQty * qty` on collect); without this the inputs
    // did not, which made a batch of 6 produce 6x the goods for 1x the materials.
    const owned = await this.inventory.ownedMap(playerId);
    const perUnit = chosenInputs ?? defaultInputsFor(recipe, owned);
    const chosen: Record<string, number> = {};
    for (const [slug, n] of Object.entries(perUnit)) chosen[slug] = n * batch;
    const requirements = this.resolveRequirements(recipe, chosen, batch);

    // Inputs owned?
    if (!(await this.inventory.hasItems(playerId, requirements))) {
      throw new BadRequestException('Missing crafting inputs');
    }

    // Fee affordable?
    const fee = batchFee(recipe, batch);
    if (!(await this.wallet.canAffordPula(playerId, fee))) {
      throw new BadRequestException('Insufficient Pula for the crafting fee');
    }

    // Free slot within the unlocked count.
    const slots = await this.unlockedSlots(farmId);
    const occupied = new Set(
      (
        (await this.client().from('crafting_jobs').select('slot_index').eq('player_id', playerId).is('collected_at', null))
          .data ?? []
      ).map((r: Record<string, unknown>) => r.slot_index as number),
    );
    let slotIndex = -1;
    for (let i = 0; i < slots; i++) {
      if (!occupied.has(i)) {
        slotIndex = i;
        break;
      }
    }
    if (slotIndex < 0) {
      throw new BadRequestException('All crafting slots are busy — collect a finished job first');
    }

    // Reserve the slot first (atomic via UNIQUE(player_id, slot_index) WHERE open),
    // then consume inputs and charge the fee. Roll back on any failure.
    const recipeRow = await this.client()
      .from('crafting_recipes')
      .select('id')
      .eq('slug', recipeSlug)
      .single();
    const { data: job, error: jobErr } = await this.client()
      .from('crafting_jobs')
      .insert({
        player_id: playerId,
        recipe_id: recipeRow.data!.id,
        slot_index: slotIndex,
        qty: batch,
      })
      .select('id, started_at')
      .single();

    if (jobErr || !job) {
      throw new Error('Failed to start crafting job');
    }

    try {
      for (const req of requirements) {
        await this.inventory.removeItem(playerId, req.slug, req.qty);
      }
      await this.wallet.spendPula(playerId, fee, 'crafting_fee');
    } catch (err) {
      // Restore: delete the reserved job and refund inputs + fee.
      await this.client().from('crafting_jobs').delete().eq('id', (job as Record<string, unknown>).id as string);
      for (const req of requirements) await this.inventory.addItem(playerId, farmId, req.slug, req.qty);
      await this.wallet.credit(playerId, 'pula', fee, 'refund');
      throw err instanceof Error ? err : new Error('Crafting start failed');
    }

    const started = new Date((job as Record<string, unknown>).started_at as string);
    const readyAt = new Date(started.getTime() + recipe.durationMinutes * 60_000).toISOString();
    return { jobId: (job as Record<string, unknown>).id as string, slotIndex, readyAt, fee };
  }

  /**
   * POST /:jobId/collect. Timer gate (03 §3.4 — variance, never failure). A batch
   * occasionally yields a bonus unit; the player is only ever surprised upward.
   */
  async collectCraft(
    playerId: string,
    farmId: string,
    jobId: string,
  ): Promise<CollectResult> {
    const { data: job, error } = await this.client()
      .from('crafting_jobs')
      .select('id, player_id, recipe_id, qty, started_at, collected_at')
      .eq('id', jobId)
      .single();
    if (error || !job) throw new NotFoundException('Crafting job not found');
    if (job.player_id !== playerId) throw new BadRequestException('Not your job');
    if (job.collected_at != null) throw new BadRequestException('Job already collected');

    const recipe = (
      await this.client().from('crafting_recipes').select('slug, duration_minutes').eq('id', job.recipe_id).single()
    ).data;
    if (!recipe) throw new NotFoundException('Recipe not found');
    const def = RECIPES[recipe.slug as keyof typeof RECIPES];

    const started = new Date(job.started_at as string);
    const readyAt = started.getTime() + (recipe.duration_minutes as number) * 60_000;
    if (Date.now() < readyAt) {
      throw new BadRequestException('Craft is not ready yet');
    }

    const baseQty = def.outputQty * (job.qty as number);
    const bonus = Math.random() < BONUS_YIELD_CHANCE;
    const total = baseQty + (bonus ? 1 : 0);

    const { overflow } = await this.inventory.addItem(playerId, farmId, def.output, total);

    await this.client()
      .from('crafting_jobs')
      .update({ collected_at: new Date().toISOString() })
      .eq('id', jobId);

    return {
      recipeSlug: recipe.slug as string,
      outputSlug: def.output,
      quantity: total - overflow,
      bonus,
      overflow,
    };
  }

  /**
   * Flatten a substitution choice into per-slug requirements, validating groups.
   * `chosen` is expected already scaled to the whole batch, so each group must
   * total `group.qty * batch`.
   */
  private resolveRequirements(
    recipe: RecipeDef,
    chosen: Record<string, number>,
    batch: BatchSize = 1,
  ): { slug: string; qty: number }[] {
    const requirements: { slug: string; qty: number }[] = [];
    for (const group of recipe.inputs) {
      let assigned = 0;
      for (const slug of group.anyOf) {
        const n = chosen[slug] ?? 0;
        if (n > 0) {
          requirements.push({ slug, qty: n });
          assigned += n;
        }
      }
      const need = group.qty * batch;
      if (assigned !== need) {
        throw new BadRequestException(
          `Recipe needs ${need} of [${group.anyOf.join(' / ')}]`,
        );
      }
    }
    return requirements;
  }
}
