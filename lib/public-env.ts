function read(name: string) {
  return process.env[name] ?? "";
}

export const publicEnv = {
  appEnv: read("NEXT_PUBLIC_APP_ENV"),
  production: read("NEXT_PUBLIC_PRODUCTION") === "true",
  gitVersion: read("NEXT_PUBLIC_GIT_VERSION"),
  ismiStatus: read("NEXT_PUBLIC_ISMI_STATUS"),
  apiConfig: read("NEXT_PUBLIC_API_CONFIG"),
  productsConfig: read("NEXT_PUBLIC_PRODUCTS_CONFIG"),
  adminConfig: read("NEXT_PUBLIC_ADMIN_CONFIG"),
  adminImgUrl: read("NEXT_PUBLIC_ADMIN_IMG_URL"),
  invConfig: read("NEXT_PUBLIC_INV_CONFIG"),
  invNewConfig: read("NEXT_PUBLIC_INV_NEW_CONFIG"),
  invConfigV4: read("NEXT_PUBLIC_INV_CONFIG_V4"),
  invImgUrl: read("NEXT_PUBLIC_INV_IMG_URL"),
  paymentConfig: read("NEXT_PUBLIC_PAYMENT_CONFIG"),
  paymentImgUrl: read("NEXT_PUBLIC_PAYMENT_IMG_URL"),
  paymentUrl: read("NEXT_PUBLIC_PAYMENT_URL"),
  ordersConfig: read("NEXT_PUBLIC_ORDERS_CONFIG"),
  orderNewConfig: read("NEXT_PUBLIC_ORDER_NEW_CONFIG"),
  ordersConfigV3: read("NEXT_PUBLIC_ORDERS_CONFIG_V3"),
  ordersImgUrl: read("NEXT_PUBLIC_ORDERS_IMG_URL"),
  ordersHistory: read("NEXT_PUBLIC_ORDERS_HISTORY"),
  sparkConfig: read("NEXT_PUBLIC_SPARK_CONFIG"),
  custConfig: read("NEXT_PUBLIC_CUST_CONFIG"),
  custNewConfig: read("NEXT_PUBLIC_CUST_NEW_CONFIG"),
  custUrl: read("NEXT_PUBLIC_CUST_URL"),
  mainBranding: read("NEXT_PUBLIC_MAIN_BRANDING"),
  mainConfig: read("NEXT_PUBLIC_MAIN_CONFIG"),
  imgUrlS3: read("NEXT_PUBLIC_IMG_URL_S3"),
  mvnoConfig: read("NEXT_PUBLIC_MVNO_CONFIG"),
  mvnoCust: read("NEXT_PUBLIC_MVNO_CUST"),
  chatwootUrl: read("NEXT_PUBLIC_CHATWOOT_URL"),
  chatwootProdUrl: read("NEXT_PUBLIC_CHATWOOT_PROD_URL"),
  resellerBrandingPreference: read("NEXT_PUBLIC_RESELLER_BRANDING_PREFERENCE"),
  stripePublishableKey: read("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
  razorpayKey: read("NEXT_PUBLIC_RAZORPAY_KEY"),
  pocEmails: read("NEXT_PUBLIC_ZETEXA_POC_EMAILS")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean),
} as const;
