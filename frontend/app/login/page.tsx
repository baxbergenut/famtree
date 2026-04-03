import { AuthCard } from "@/components/auth-card";
import { SiteHeader } from "@/components/site-header";

export default function LoginPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-6xl gap-10 px-6 pb-16 pt-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-10">
        <div className="rounded-[34px] border border-[var(--line-soft)] bg-white/62 p-8 shadow-[0_30px_110px_rgba(31,27,24,0.12)]">
          <p className="text-sm font-semibold tracking-[0.22em] text-[var(--accent-strong)] uppercase">
            Returning to your canvas
          </p>
          <h1 className="mt-4 font-serif-display text-5xl leading-none text-[var(--ink-strong)]">
            Continue building your family tree.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-8 text-[var(--ink-soft)]">
            This route is ready for the upcoming auth implementation. The UI shell is in place so the next pass can connect form submission, session handling, and redirect logic cleanly.
          </p>
        </div>
        <AuthCard
          mode="login"
          eyebrow="Log in"
          title="Welcome back"
          description="Use your email to return to the tree centered on your root node."
          submitLabel="Log in"
          alternateHref="/register"
          alternateLabel="Create one"
          alternateText="Need an account?"
        />
      </main>
    </div>
  );
}
