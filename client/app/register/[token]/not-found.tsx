import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { content } from "@/lib/content";

export default function NotFound() {
  const { register } = content;
  return (
    <main className="min-h-screen bg-ink">
      <SiteHeader
        label="INVITATION NOT FOUND"
        title={register.invalidTitle}
        intro={register.invalidBody}
      />
      <SiteFooter />
    </main>
  );
}
