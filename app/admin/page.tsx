import { admin } from "@/content/admin";
import { pageMetadata } from "@/lib/seo";
import { AdminApp } from "@/components/admin/AdminApp";

// Page interne, non indexée et absente du sitemap. Coquille statique : la connexion et le
// contenu passent par /api/admin/* (aucune donnée privée dans le HTML).
export const metadata = pageMetadata({
  title: admin.title,
  description: admin.intro,
  path: "/admin",
  noindex: true,
});

export default function AdminPage() {
  return (
    <section aria-labelledby="admin-title" className="theme-light section">
      <div className="container-page flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <h1 id="admin-title" className="text-h2">
            {admin.title}
          </h1>
          <p className="max-w-2xl text-ink-muted">{admin.intro}</p>
        </header>
        <AdminApp />
      </div>
    </section>
  );
}
