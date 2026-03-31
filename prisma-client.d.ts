type PrismaModelRecord = {
  id: string;
  [key: string]: unknown;
};

type PrismaCreateResult<TModel extends PrismaModelRecord> = TModel;
type PrismaFindResult<TModel extends PrismaModelRecord> = TModel | null;
type PrismaFindManyResult<TModel extends PrismaModelRecord> = TModel[];

type PrismaDelegate<TModel extends PrismaModelRecord> = {
  create(args: unknown): Promise<PrismaCreateResult<TModel>>;
  findUnique(args: unknown): Promise<PrismaFindResult<TModel>>;
  findFirst(args: unknown): Promise<PrismaFindResult<TModel>>;
  findMany(args: unknown): Promise<PrismaFindManyResult<TModel>>;
  update(args: unknown): Promise<PrismaCreateResult<TModel>>;
  updateMany(args: unknown): Promise<{ count: number }>;
  delete(args: unknown): Promise<PrismaCreateResult<TModel>>;
  deleteMany(args: unknown): Promise<{ count: number }>;
  count(args: unknown): Promise<number>;
};

type PrismaUser = PrismaModelRecord & {
  email: string;
  name: string | null;
  passwordHash: string;
  createdAt: Date;
};

type PrismaSession = PrismaModelRecord & {
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
};

type PrismaStrategy = PrismaModelRecord & {
  userId: string;
  allocation: unknown;
  metrics: unknown;
  simulationResults: unknown;
  simulationSeed: number | null;
  simulationMode: string | null;
  simulationShock: unknown;
  createdAt: Date;
};

type PrismaSimulationRun = PrismaModelRecord & {
  name: string;
  status: string;
  assumptions: unknown;
  results: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaShockEvent = PrismaModelRecord & {
  title: string;
  description: string;
  marketImpact: unknown;
  modifiers: unknown;
  active: boolean;
  weekStart: Date;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaAuditLog = PrismaModelRecord & {
  userId: string | null;
  action: string;
  metadata: unknown;
  createdAt: Date;
};

type PrismaClientLike = {
  user: PrismaDelegate<PrismaUser>;
  session: PrismaDelegate<PrismaSession>;
  strategy: PrismaDelegate<PrismaStrategy>;
  simulationRun: PrismaDelegate<PrismaSimulationRun>;
  shockEvent: PrismaDelegate<PrismaShockEvent>;
  auditLog: PrismaDelegate<PrismaAuditLog>;
  $transaction<T extends readonly unknown[]>(operations: T): Promise<{
    [K in keyof T]: Awaited<T[K]>;
  }>;
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
};

type PrismaClientOptions = {
  adapter: unknown;
  log?: string[];
};

declare module "@prisma/client" {
  export const PrismaClient: new (optionsArg: PrismaClientOptions) => PrismaClientLike;
}
