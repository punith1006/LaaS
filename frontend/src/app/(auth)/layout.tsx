import { LeftPanel } from "@/components/auth/left-panel";
import { RightPanelShell } from "@/components/auth/right-panel-shell";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-neutral-100 px-4 py-8 md:px-8">
      <div className="flex w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl md:h-[90vh] md:max-h-[860px] md:min-h-[680px]">
        <LeftPanel />
        <RightPanelShell>{children}</RightPanelShell>
      </div>
    </div>
  );
}
