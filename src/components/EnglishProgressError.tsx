export function EnglishProgressError({ href }: { href: string }) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">English progress unavailable</h1>
      <p role="alert">
        Your saved progress could not load. Reload before continuing.
      </p>
      <a
        href={href}
        className="inline-flex min-h-11 items-center text-brand underline"
      >
        Reload progress
      </a>
    </div>
  );
}
