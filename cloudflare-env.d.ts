declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    SOLANA_NETWORK?: string;
    SOLANA_RPC_URL?: string;
    LAUNCH_ENABLED?: string;
    PINATA_JWT?: string;
    PUBLIC_METADATA_BASE_URL?: string;
  }
}
