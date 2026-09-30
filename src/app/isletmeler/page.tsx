"use client";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPhone, faClock, faRestroom, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

type B = { id: string; name: string; category: string; phone?: string; priceInfo?: string; hasToilet: boolean; opensAt?: string; closesAt?: string };

export default function Isletmeler() {
  const [q, setQ] = useState(""); const [items, setItems] = useState<B[]>([]);
  useEffect(() => { const t = setTimeout(() => fetch(`/api/businesses?q=${encodeURIComponent(q)}`).then(r => r.json()).then(setItems).catch(() => setItems([])), 250); return () => clearTimeout(t); }, [q]);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl">İşletmeler</h1>
      <div className="mt-4 flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow">
        <FontAwesomeIcon icon={faMagnifyingGlass} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="İşletme ara..." className="w-full bg-transparent outline-none" />
      </div>
      <ul className="mt-6 grid gap-3">
        {items.map(b => (
          <li key={b.id} className="rounded-2xl bg-white p-4 shadow">
            <div className="flex justify-between"><b>{b.name}</b><span className="text-sm text-olive">{b.category}</span></div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm opacity-80">
              {b.phone && <span><FontAwesomeIcon icon={faPhone} /> {b.phone}</span>}
              {b.opensAt && <span><FontAwesomeIcon icon={faClock} /> {b.opensAt}–{b.closesAt}</span>}
              <span><FontAwesomeIcon icon={faRestroom} /> {b.hasToilet ? "Tuvalet var" : "Tuvalet yok"}</span>
              {b.priceInfo && <span>{b.priceInfo}</span>}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
