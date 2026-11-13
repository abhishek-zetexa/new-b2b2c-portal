import { publicEnv } from "@/lib/public-env";
import { upstream, upstreamData } from "@/lib/upstream";

function query(params: URLSearchParams, key: string) {
  return (params.get(key) ?? "").trim();
}

function locationFilter(params: URLSearchParams) {
  const region = query(params, "region_name");
  const country = query(params, "country_code");
  if (region) return { filterby: "Region", region_name: region };
  if (country) return { filterby: "Country", country_code: country };
  return {};
}

function withParams(base: string, entries: Record<string, string>) {
  const url = new URL(base);
  for (const [key, value] of Object.entries(entries)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const resource = query(params, "resource");

  if (resource === "countries") {
    return upstream(withParams(`${publicEnv.invConfig}Reseller/Get-All-Countries`, {
      page: query(params, "page") || "1",
      page_size: query(params, "page_size") || "12",
      query: query(params, "query"),
    }));
  }
  if (resource === "countries-range") {
    return upstream(withParams(`${publicEnv.invConfig}Reseller/Get-All-Countries-In-Range`, {
      start_at: query(params, "start"),
      end_at: query(params, "end"),
      page: query(params, "page") || "1",
      page_size: query(params, "page_size") || "50",
    }));
  }
  if (resource === "regions") return upstream(`${publicEnv.invConfig}Reseller/Get-All-Regions`);
  if (resource === "overview") {
    return upstream(withParams(`${publicEnv.invConfig}planoverview`, {
      filterby: query(params, "filterby") || "Region",
      country_code: query(params, "country_code"),
      region_name: query(params, "region_name"),
    }));
  }
  if (resource === "local-countries") return upstream(`${publicEnv.invConfig}reseller/mvno/get-countries`);
  if (resource === "travel-plans") {
    return upstream(withParams(`${publicEnv.invNewConfig}b2b2c/resellers/packages`, {
      reseller_id: query(params, "reseller_id"),
      ...locationFilter(params),
      plan_name: query(params, "plan_name"),
      min_validity: query(params, "min_validity"),
      max_validity: query(params, "max_validity"),
      page: query(params, "page") || "1",
      page_size: query(params, "page_size") || "10",
    }));
  }
  if (resource === "topup-plans") {
    return upstream(withParams(`${publicEnv.invConfigV4}packages-list`, {
      reseller_id: query(params, "reseller_id"),
      ...locationFilter(params),
      plan_name: query(params, "plan_name"),
      min_validity: query(params, "min_validity"),
      max_validity: query(params, "max_validity"),
      iccid: query(params, "iccid"),
      page: query(params, "page"),
      page_size: query(params, "page_size"),
    }));
  }
  if (resource === "local-package") {
    return upstream(withParams(`${publicEnv.invConfig}reseller/mvno/groups/get-packages`, {
      filterby: query(params, "filterby"),
      country_code: query(params, "country_code"),
      plan_name: query(params, "plan_name"),
      reseller_id: query(params, "reseller_id"),
      currency: query(params, "currency"),
      validity_days: query(params, "validity_days"),
    }));
  }
  if (resource === "local-plans") {
    return upstream(withParams(`${publicEnv.invConfig}b2b/mvno/groups/get-packages`, {
      reseller_id: query(params, "reseller_id"),
      currency: query(params, "currency"),
      ...locationFilter(params),
      validity_days: query(params, "validity_days"),
      plan_name: query(params, "plan_name"),
      page: query(params, "page"),
      page_size: query(params, "page_size"),
    }));
  }
  if (resource === "packages") {
    return upstream(withParams(`${publicEnv.invConfigV4}packages-list`, {
      filterby: query(params, "filterby"),
      country_code: query(params, "country_code"),
      region_name: query(params, "region_name"),
      plan_name: query(params, "plan_name"),
      reseller_id: query(params, "reseller_id"),
      min_validity: query(params, "min_validity"),
      max_validity: query(params, "max_validity"),
      plan_type: query(params, "plan_type"),
      min_price: query(params, "min_price"),
      max_price: query(params, "max_price"),
    }));
  }
  if (resource === "destinations") return upstream(`${publicEnv.adminConfig}Country-Region-List`);
  if (resource === "last-checkout") return upstream(`${publicEnv.orderNewConfig}v2/reseller/agent/last-checkout`);
  if (resource === "cart") {
    return upstream(withParams(`${publicEnv.orderNewConfig}v2/reseller/agent/get-cart`, {
      checkout_id: query(params, "checkout_id"),
    }), {}, 8000);
  }
  if (resource === "brands") return upstream(`${publicEnv.adminConfig}alldevicebrands`);
  if (resource === "devices") {
    return upstream(withParams(`${publicEnv.adminConfig}alldevicenames`, { brand_id: query(params, "brand_id") }));
  }
  if (resource === "device-search") {
    return upstream(withParams(`${publicEnv.adminConfig}search/devicenames`, {
      brand_id: query(params, "brand_id"),
      user_query: query(params, "user_query"),
    }));
  }
  if (resource === "addresses") {
    return upstream(withParams(`${publicEnv.custConfig}reseller/agent/get-customer_address`, {
      customer_id: query(params, "customer_id"),
    }));
  }
  if (resource === "iccids") {
    return upstream(withParams(`${publicEnv.ordersConfig}reseller/agent/sim-list`, {
      search: query(params, "search"),
      status: publicEnv.ismiStatus,
      page_size: "100",
      page_number: "1",
    }));
  }
  if (resource === "restricted") return upstream(`${publicEnv.adminConfig}restrictedCountries`);
  if (resource === "qr") {
    return upstream(withParams(`${publicEnv.ordersConfigV3}Reseller/Orders/GetQrCode`, {
      order_id: query(params, "order_id"),
    }));
  }
  if (resource === "services") {
    return upstream(withParams(`${publicEnv.invConfig}b2b-partner/airport-addons/available-services`, {
      reseller_id: query(params, "reseller_id"),
      agent_id: query(params, "agent_id"),
    }));
  }
  if (resource === "states") {
    return upstream(withParams(`${publicEnv.mvnoConfig}api/reseller/v1/states-list`, {
      iso3_code: query(params, "iso3_code"),
    }));
  }
  if (resource === "state-zips") {
    return upstream(withParams(`${publicEnv.invConfig}reseller/get-zip-code-by-state`, {
      state_code: query(params, "state_code"),
    }));
  }
  if (resource === "zip-search") {
    return upstream(withParams(`${publicEnv.mvnoConfig}api/reseller/v1/search-zip-code`, {
      state_code: query(params, "state_code"),
      search: query(params, "search"),
    }));
  }
  if (resource === "coverage") {
    return upstream(withParams(`${publicEnv.invConfig}reseller/check-services`, {
      zipcode: query(params, "zipcode"),
      iso3_code: query(params, "iso3_code"),
    }));
  }
  return Response.json({ message: "Unknown Buy SIMs request." }, { status: 400 });
}

async function readBody(request: Request) {
  return (await request.json().catch(() => null)) as Record<string, unknown> | null;
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const resource = String(form.get("resource") || "");
    form.delete("resource");
    if (resource === "ekyc") {
      return upstream(`${publicEnv.custNewConfig}customer/upload-address-docs`, { method: "POST", body: form });
    }
    return Response.json({ message: "Unknown Buy SIMs request." }, { status: 400 });
  }
  const body = await readBody(request);
  if (!body) return Response.json({ message: "Invalid request." }, { status: 400 });
  const resource = String(body.resource || "");
  const payload = { ...body };
  delete payload.resource;

  if (resource === "cart-add") {
    return upstream(`${publicEnv.orderNewConfig}v2/reseller/agent/add-to-cart`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
  if (resource === "checkout-packages") {
    return upstream(`${publicEnv.orderNewConfig}v2/reseller/agent/check-out-packages`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
  if (resource === "assign-address") {
    return upstream(`${publicEnv.orderNewConfig}v2/reseller/agent/checkout/assign-address`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
  if (resource === "assign-customer") {
    return upstream(`${publicEnv.orderNewConfig}v2/reseller/agent/create-checkout`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
  if (resource === "topup-summary") {
    return upstream(`${publicEnv.ordersConfig}reseller/agent/topup-summary`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
  if (resource === "update-line") {
    return upstream(`${publicEnv.ordersConfig}reseller/agent/update-checkout`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
  if (resource === "ekyc-check") {
    return upstream(`${publicEnv.custNewConfig}customer/check-documents`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
  if (resource === "address") {
    const customerId = String(payload.customer_id || "");
    return upstream(`${publicEnv.custConfig}reseller/agent/manage-customer-address?customer_id=${encodeURIComponent(customerId)}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
  if (resource === "mvno-cart") {
    return upstream(`${publicEnv.ordersConfig}mvno/create-cart`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
  if (resource === "mvno-sim-type") {
    return upstream(`${publicEnv.ordersConfig}mvno/update-sim_type`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
  if (resource === "mvno-service") {
    return upstream(`${publicEnv.ordersConfig}mvno/check-cart-service`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
  if (resource === "customer-info") {
    return upstream(`${publicEnv.custConfig}reseller/agent/update-customer-info`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
  if (resource === "mvno-date") {
    return upstream(`${publicEnv.ordersConfig}mvno/update-cart`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }
  if (resource === "mvno-order") {
    const result = await upstreamData(`${publicEnv.ordersConfig}mvno/process-order`, {
      method: "POST",
      body: JSON.stringify(payload),
    }, 30000);
    return Response.json(result.payload, { status: result.status === 504 ? 504 : result.status });
  }
  if (resource === "pay") {
    const result = await upstreamData(`${publicEnv.orderNewConfig}v2/reseller/agent/checkout/process`, {
      method: "POST",
      body: JSON.stringify(payload),
    }, 30000);
    return Response.json(result.payload, { status: result.status >= 400 ? result.status : 200 });
  }
  return Response.json({ message: "Unknown Buy SIMs request." }, { status: 400 });
}

export async function PUT(request: Request) {
  const body = await readBody(request);
  if (!body) return Response.json({ message: "Invalid request." }, { status: 400 });
  const resource = String(body.resource || "");
  const payload = { ...body };
  delete payload.resource;

  if (resource === "cart-update" || resource === "addon") {
    return upstream(`${publicEnv.orderNewConfig}v2/reseller/agent/add-to-cart`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }
  if (resource === "cart-delete") {
    return upstream(`${publicEnv.orderNewConfig}v2/reseller/agent/delete-cart`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }
  if (resource === "nationality") {
    return upstream(`${publicEnv.custConfig}reseller/customer/residingAtNationality`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }
  return Response.json({ message: "Unknown Buy SIMs request." }, { status: 400 });
}

export async function PATCH(request: Request) {
  const body = await readBody(request);
  if (!body) return Response.json({ message: "Invalid request." }, { status: 400 });
  const addressId = String(body.address_id || "");
  const payload = { ...body };
  delete payload.resource;
  delete payload.address_id;
  return upstream(`${publicEnv.custConfig}reseller/agent/manage-customer-address?address_id=${encodeURIComponent(addressId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function DELETE(request: Request) {
  const addressId = query(new URL(request.url).searchParams, "address_id");
  if (!addressId) return Response.json({ message: "Address is required." }, { status: 400 });
  return upstream(`${publicEnv.custConfig}reseller/agent/manage-customer-address?address_id=${encodeURIComponent(addressId)}`, {
    method: "DELETE",
  });
}
