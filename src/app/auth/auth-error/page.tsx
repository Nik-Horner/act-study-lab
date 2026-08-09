import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

export default function AuthErrorPage() {
  return (
    <div className="mx-auto max-w-md">
      <Card className="p-8 text-center">
        <h1 className="text-xl font-semibold">That link didn&apos;t work</h1>
        <p className="mt-2 text-sm text-ink-soft">
          It may have expired or already been used. Try logging in, or request a new
          confirmation email by signing up again.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <ButtonLink href="/login">Log in</ButtonLink>
          <Link href="/signup" className="self-center text-sm text-ink-soft hover:text-ink">
            Sign up
          </Link>
        </div>
      </Card>
    </div>
  );
}
