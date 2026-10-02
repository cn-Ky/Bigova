import { safePdfUrl } from "@/lib/pdfReader";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { redirect } from "next/navigation";
import PdfFrame from "./PdfFrame";

type SearchParams = { url?: string; title?: string };

export default function Belge({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const documentUrl = safePdfUrl(searchParams.url);
  if (searchParams.url && !documentUrl) redirect("/dergi");
  const title = searchParams.title?.trim().slice(0, 160) || "Belge okuyucu";

  return (
    <main className="flex min-h-[calc(100dvh-5rem)] flex-col px-3 pb-4 pt-3 sm:px-5">
      <header className="mb-3 flex items-center gap-3 rounded-2xl bg-card px-3 py-3 shadow-sm">
        <Link
          href="/"
          aria-label="Geri dön"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sea text-white"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </Link>
        <h1 className="min-w-0 flex-1 break-words font-display text-base font-extrabold leading-tight">
          {title}
        </h1>
      </header>
      <PdfFrame initialUrl={documentUrl} title={title} />
    </main>
  );
}
