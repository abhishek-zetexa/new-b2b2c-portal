import "server-only";

function read(name: string) {
  return process.env[name] ?? "";
}

export const serverEnv = {
  chatwootToken: read("CHATWOOT_TOKEN"),
  chatwootProdToken: read("CHATWOOT_PROD_TOKEN"),
  secretKey: read("SECRET_KEY"),
  sampleKey: read("SAMPLE_KEY"),
  internalApiKey: read("INTERNAL_API_KEY"),
};
