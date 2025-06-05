import { MainNav } from "@/components/MainNav";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <MainNav />
      {/* Add padding-top to account for fixed header */}
      <main className="flex-grow pt-[92px]">{children}</main>
    </div>
  );
}
