"use client";

import { LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PLACES } from "@/lib/astro/places";
import type { Place } from "@/lib/astro/constants";
import { saveBirthDetails } from "@/server/actions/horoscope";

const OTHER = "__other__";
const selectClass = "h-11 w-full bg-subtle/25 bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-foreground/15";

export function PlacePicker({ value, onChange, id }: { value: Place | null; onChange: (p: Place | null) => void; id: string }) {
  const known = value && PLACES.find((p) => p.name === value.name && Math.abs(p.lat - value.lat) < 0.01);
  const [mode, setMode] = useState<"list" | "other">(value && !known ? "other" : "list");
  const [custom, setCustom] = useState({ name: value?.name ?? "", lat: value ? String(value.lat) : "", lon: value ? String(value.lon) : "", tz: value?.tz ?? "Asia/Kolkata" });
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["Asia/Kolkata"];

  const emitCustom = (c: typeof custom) => {
    setCustom(c);
    const lat = Number(c.lat);
    const lon = Number(c.lon);
    onChange(c.name.trim() && c.lat && c.lon && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { name: c.name.trim(), lat, lon, tz: c.tz } : null);
  };

  return (
    <div className="space-y-2">
      <select
        id={id}
        className={selectClass}
        value={mode === "other" ? OTHER : (value?.name ?? "")}
        onChange={(e) => {
          if (e.target.value === OTHER) {
            setMode("other");
            emitCustom(custom);
          } else {
            setMode("list");
            onChange(PLACES.find((p) => p.name === e.target.value) ?? null);
          }
        }}
      >
        <option value="" disabled>
          Choose a city
        </option>
        {PLACES.map((p) => (
          <option key={p.name} value={p.name}>
            {p.name}
          </option>
        ))}
        <option value={OTHER}>Other place (enter coordinates)…</option>
      </select>
      {mode === "other" && (
        <div className="grid grid-cols-2 gap-2">
          <Input className="col-span-2" placeholder="Place name" aria-label="Place name" value={custom.name} onChange={(e) => emitCustom({ ...custom, name: e.target.value })} />
          <Input placeholder="Latitude (e.g. 26.85)" aria-label="Latitude" inputMode="decimal" value={custom.lat} onChange={(e) => emitCustom({ ...custom, lat: e.target.value })} />
          <Input placeholder="Longitude (e.g. 80.95)" aria-label="Longitude" inputMode="decimal" value={custom.lon} onChange={(e) => emitCustom({ ...custom, lon: e.target.value })} />
          <select aria-label="Time zone" className={`${selectClass} col-span-2`} value={custom.tz} onChange={(e) => emitCustom({ ...custom, tz: e.target.value })}>
            {zones.map((z) => (
              <option key={z}>{z}</option>
            ))}
          </select>
          <p className="col-span-2 text-xs text-muted">Find coordinates by long-pressing the place in any maps app. East and North are positive.</p>
        </div>
      )}
    </div>
  );
}

export function BirthForm({ initial, onDone }: { initial?: { date: string; time: string | null; place: Place } | null; onDone?: () => void }) {
  const [date, setDate] = useState(initial?.date ?? "");
  const [time, setTime] = useState(initial?.time ?? "");
  const [unknownTime, setUnknownTime] = useState(initial ? initial.time === null : false);
  const [place, setPlace] = useState<Place | null>(initial?.place ?? null);
  const [livesHere, setLivesHere] = useState(!initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!date) return setError("Add your birth date");
    if (!unknownTime && !time) return setError("Add your birth time, or tick “I don’t know”");
    if (!place) return setError("Choose where you were born");
    setError(null);
    startTransition(async () => {
      await saveBirthDetails({ date, time: unknownTime ? null : time, place }, livesHere);
      onDone?.();
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="birth-date">Birth date</Label>
          <Input id="birth-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="birth-time">Birth time</Label>
          <Input id="birth-time" type="time" value={time} disabled={unknownTime} onChange={(e) => setTime(e.target.value)} />
          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={unknownTime} onChange={(e) => setUnknownTime(e.target.checked)} /> I don’t know my birth time
          </label>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="birth-place">Birth place</Label>
        <PlacePicker id="birth-place" value={place} onChange={setPlace} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={livesHere} onChange={(e) => setLivesHere(e.target.checked)} /> I live here now (used for sunrise and Rahu Kaal)
      </label>
      <p className="text-xs text-muted">
        Without a birth time, your Rashi and Nakshatra are still computed (rarely off by one near a boundary), but Lagna can’t be.
      </p>
      {error && <p className="text-xs">— {error}</p>}
      <Button size="lg" className="w-full" onClick={submit} disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" /> : "Save birth details"}
      </Button>
    </div>
  );
}
