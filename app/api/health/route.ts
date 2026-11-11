import { publicEnv } from "@/lib/public-env";
import { serverEnv } from "@/lib/server-env";

export function GET() {
  return Response.json({
    env: publicEnv.appEnv,
    version: publicEnv.gitVersion,
    services: {
      api: Boolean(publicEnv.apiConfig),
      products: Boolean(publicEnv.productsConfig),
      admin: Boolean(publicEnv.adminConfig),
      inventory: Boolean(publicEnv.invConfig),
      payments: Boolean(publicEnv.paymentConfig),
      orders: Boolean(publicEnv.ordersConfig),
      customers: Boolean(publicEnv.custConfig),
    },
    secretsConfigured: {
      chatwoot: Boolean(serverEnv.chatwootToken),
      secretKey: Boolean(serverEnv.secretKey),
      sampleKey: Boolean(serverEnv.sampleKey),
      internalApiKey: Boolean(serverEnv.internalApiKey),
    },
  });
}
