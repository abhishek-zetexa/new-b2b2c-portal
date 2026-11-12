"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { installationGuides } from "@/lib/installation-guides";

type Device = keyof typeof installationGuides;
type Guide = (typeof installationGuides)[Device][number];

export function InstallationGuideView() {
  const [device, setDevice] = useState<Device>("ios");
  const guides = installationGuides[device];

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Installation Guide</h1>
      <Tabs value={device} onValueChange={(value) => setDevice(value as Device)}>
        <TabsList>
          <TabsTrigger value="ios">IOS</TabsTrigger>
          <TabsTrigger value="android">Android</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="space-y-4">
        {guides.map((guide, index) => (
          <GuideCard key={guide.title} index={index} guide={guide} />
        ))}
      </div>
    </div>
  );
}

function GuideCard({ index, guide }: { index: number; guide: Guide }) {
  const pdf = "pdf" in guide ? guide.pdf : "";
  const pdfName = "pdfName" in guide ? guide.pdfName : "";

  return (
    <article className="grid min-w-0 overflow-hidden rounded-3xl bg-[#1c1c24] text-white shadow-[var(--shadow)] md:grid-cols-2">
      <a href={guide.video} target="_blank" rel="noreferrer" className="relative block min-w-0 bg-black md:min-h-52">
        <img src={guide.thumbnail} alt="" className="aspect-[465/200] h-auto w-full object-contain md:absolute md:inset-0 md:aspect-auto md:h-full md:object-cover" />
        <span className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-[#1c1c24] shadow-lg" aria-label="Play">
          <span className="ml-1 block h-0 w-0 border-y-[10px] border-l-[16px] border-y-transparent border-l-current" />
        </span>
      </a>
      <div className="flex min-w-0 flex-col justify-center gap-5 p-5 sm:p-7">
        <h2 className="text-xl font-semibold leading-7">{index + 1}. {guide.title}</h2>
        {pdf ? (
          <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-3">
            <span className="min-w-0 text-sm leading-5">{pdfName}</span>
            <a href={pdf} target="_blank" rel="noreferrer" className="shrink-0 text-sm font-semibold text-white/80">Open</a>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(guide.video).then(() => toast.success("Guide link copied to clipboard!"))}
            className="inline-flex h-11 min-w-40 flex-1 cursor-pointer items-center justify-center rounded-full border border-white/25 px-4 text-sm font-semibold"
          >
            Share video Link
          </button>
          {pdf ? (
            <a href={pdf} target="_blank" rel="noreferrer" className="inline-flex h-11 min-w-40 flex-1 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-on-primary">
              Share pdf link
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
