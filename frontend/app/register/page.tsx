import { AuthCard } from "@/components/auth-card";
import { SiteHeader } from "@/components/site-header";

export default function RegisterPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-6xl gap-10 px-6 pb-16 pt-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-10">
        <div className="rounded-[34px] border border-(--line-soft) bg-[rgba(10,15,25,0.68)] p-8 shadow-[0_30px_110px_rgba(0,0,0,0.26)]">
          <p className="text-sm font-semibold tracking-[0.22em] text-(--accent-strong) uppercase">
            Start with yourself
          </p>
          <h1 className="mt-4 font-serif-display text-5xl leading-none text-(--ink-strong)">
            Create an account and open the tree from the center.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-8 text-(--ink-soft)">
            Registration will create the user, the private tree, and the
            highlighted root person in a single backend flow. This page is ready
            for that API wiring.
          </p>
        </div>
        <AuthCard
          mode="register"
          eyebrow="Register"
          title="Open your tree"
          description="Sign up with your name, email, and password to start from your own root node."
          submitLabel="Create account"
          alternateHref="/login"
          alternateLabel="Log in"
          alternateText="Already have an account?"
        />
      </main>
    </div>
  );
}
