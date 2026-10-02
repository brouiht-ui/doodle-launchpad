export type Coin = { id: string; owner: string; name: string; symbol: string; description: string; pair: string; image: string; communityBps: number; status: string; createdAt: number; mint?: string; signature?: string; example?: number };
export type Job = { id: string; coinId: string; owner: string; title: string; description: string; reward: string; status: string; createdAt: number; coinName?: string; submissions?: Submission[] };
export type Submission = { id: string; jobId: string; wallet: string; url: string; note: string; status: string; signature?: string };
export type Config = { network: string; launchEnabled: boolean; launchReason: string; pairs: { symbol: string; name: string; enabled: boolean; reason?: string }[] };
