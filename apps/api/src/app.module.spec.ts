import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

/**
 * THE DI GRAPH IS A TEST.
 *
 * Every other spec in this suite builds a service directly:
 *
 *     Test.createTestingModule({ providers: [SomeService, { provide: X, useValue: x }] })
 *
 * which BYPASSES the Nest module graph completely. That is why a missing
 * `imports: [WalletModule]` in `ContractsModule` survived a green suite and a
 * clean `tsc`, then took the whole API down at boot with:
 *
 *     Nest can't resolve dependencies of the ContractsService
 *     (SupabaseService, InventoryService, ?). ... argument WalletService at index [2]
 *
 * `compile()` is the only thing that walks the real injector graph — imports,
 * exports, @Global() modules and all — so this is the assertion that actually
 * covers wiring. It is cheap (no HTTP listener, no database traffic) and it is
 * the test that would have caught the bug.
 *
 * Note it asserts RESOLUTION, not behaviour: `onModuleInit` hooks are not run by
 * `compile()`, so nothing here talks to Supabase.
 */
describe('AppModule — dependency injection graph', () => {
  it('compiles: every provider in every module can be constructed', async () => {
    // `compile()` is the assertion. If any provider's constructor argument is not
    // reachable through its module's imports/exports (or a @Global module),
    // Nest throws here — the same failure `nest start` produces.
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(moduleRef).toBeDefined();

    // No per-service `get()` spot-checks on purpose. Leaf services are scoped to
    // their own module and providers are keyed by CLASS token, not by string, so
    // such assertions fail on a correctly-wired app and prove nothing extra.
    // `compile()` above is the assertion that matters: it walks the entire
    // injector graph and throws on the first unresolvable dependency.
  });
});
