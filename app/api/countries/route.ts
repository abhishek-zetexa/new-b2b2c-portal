export async function GET() {
  try {
    const response = await fetch("https://partners-qa.dev.zetexa.com/assets/countries.json", {
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!response.ok) {
      return Response.json({ message: "Country list is unavailable." }, { status: 502 });
    }
    const data = (await response.json()) as unknown;
    if (!Array.isArray(data)) {
      return Response.json({ message: "Country list is unavailable." }, { status: 502 });
    }
    return Response.json(data);
  } catch {
    return Response.json({ message: "Country list is unavailable." }, { status: 502 });
  }
}
