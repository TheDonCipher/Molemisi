/**
 * A deliberately tiny stand-in for the Supabase query client, used by the service
 * specs. The real client is a chainable builder whose every terminal (`await`,
 * `.single()`, `.insert().select()`) resolves to `{ data, error }`. Our services
 * issue DB round-trips in a fixed, sequential order, so a single thenable builder
 * that pops the *next* queued response on each `await` reproduces that ordering
 * exactly — without reimplementing Supabase's join semantics.
 *
 * Usage:
 *   const { client, calls } = makeFakeSupabase([ { data: {...}, error: null }, ... ]);
 *   const svc = new InventoryService({ getAdminClient: () => client } as any, {} as any);
 * Every awaited query consumes one entry from `sequence` in order.
 *
 * `calls` records every builder method in order, with the table it was issued
 * against, so a spec can assert what was *written* and not only what was read —
 * which is the whole point for server-authoritative services (03 §8). The table
 * is captured at call time, which is safe because a chain like
 * `from('x').update({}).eq()` is built synchronously before it is awaited.
 */

export interface FakeResult {
  data: unknown;
  error: { message: string } | null;
}

export interface FakeCall {
  table: string;
  method: string;
  args: unknown[];
}

class FakeBuilder {
  private idx = 0;
  /** Every builder call, in order. Lets specs assert writes. */
  readonly calls: FakeCall[] = [];

  constructor(
    private readonly sequence: FakeResult[],
    private readonly tableRef: { current: string },
  ) {}

  private record(method: string, args: unknown[]): void {
    this.calls.push({ table: this.tableRef.current, method, args });
  }

  // Every builder method returns `this` so chains compose; only `then` (triggered
  // by `await` or `.single()`) actually resolves a response from the queue.
  select(...cols: string[]): this {
    this.record('select', cols);
    return this;
  }
  insert(row: unknown): this {
    this.record('insert', [row]);
    return this;
  }
  update(row: unknown): this {
    this.record('update', [row]);
    return this;
  }
  delete(): this {
    this.record('delete', []);
    return this;
  }
  upsert(row: unknown, opts?: unknown): this {
    this.record('upsert', [row, opts]);
    return this;
  }
  eq(col: string, val: unknown): this {
    this.record('eq', [col, val]);
    return this;
  }
  is(col: string, val: unknown): this {
    this.record('is', [col, val]);
    return this;
  }
  gt(col: string, val: unknown): this {
    this.record('gt', [col, val]);
    return this;
  }
  gte(col: string, val: unknown): this {
    this.record('gte', [col, val]);
    return this;
  }
  lt(col: string, val: unknown): this {
    this.record('lt', [col, val]);
    return this;
  }
  order(col: string, opts?: unknown): this {
    this.record('order', [col, opts]);
    return this;
  }
  limit(n: number): this {
    this.record('limit', [n]);
    return this;
  }
  single(): this {
    this.record('single', []);
    return this;
  }
  maybeSingle(): this {
    this.record('maybeSingle', []);
    return this;
  }

  then(
    onFulfilled: (value: FakeResult) => void,
    _onRejected?: (reason: unknown) => void,
  ): Promise<void> {
    const item = this.sequence[this.idx++] ?? { data: null, error: null };
    return Promise.resolve().then(() => onFulfilled(item));
  }
}

export function makeFakeSupabase(sequence: FakeResult[] = []) {
  const tableRef = { current: '' };
  const builder = new FakeBuilder(sequence, tableRef);
  const client = {
    from: jest.fn((table: string) => {
      tableRef.current = table;
      return builder;
    }),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
  return { client, builder, from: client.from, calls: builder.calls };
}

/** Convenience: the payload of the first `update` written to `table`. */
export function updateTo(calls: FakeCall[], table: string): Record<string, unknown> | undefined {
  const call = calls.find((c) => c.method === 'update' && c.table === table);
  return call ? (call.args[0] as Record<string, unknown>) : undefined;
}

/** Convenience: every `update` payload written to `table`, in order. */
export function updatesTo(calls: FakeCall[], table: string): Array<Record<string, unknown>> {
  return calls
    .filter((c) => c.method === 'update' && c.table === table)
    .map((c) => c.args[0] as Record<string, unknown>);
}
