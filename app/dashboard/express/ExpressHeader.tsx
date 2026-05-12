"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";

const EXPRESS_TITLE_MAP: Record<string, string> = {
  "/dashboard/express": "Painel Express",
  "/dashboard/express/contrato": "Contrato",
  "/dashboard/express/nota-fiscal": "Nota fiscal",
  "/dashboard/express/copsoq": "Relatório COPSOQ",
  "/dashboard/express/login": "Acesso de usuários",
};

const DEFAULT_EXPRESS_IMAGE = "/images/alma4d_express_nobground.png";

export default function ExpressHeader({

  userImage,
  clientImage,
}: {
  onMenuOpen: () => void;
  userImage?: string;
  clientImage?: string;
}) {
  const pathname = usePathname();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarSrc =
    avatarFailed || (!userImage && !clientImage)
      ? DEFAULT_EXPRESS_IMAGE
      : (userImage ?? clientImage ?? DEFAULT_EXPRESS_IMAGE);

  const title = useMemo(() => {
    return EXPRESS_TITLE_MAP[pathname] ?? "Dashboard Express";
  }, [pathname]);

  return (
    <header className="bg-white border-b border-border sticky top-0 z-30">
      
    </header>
  );
}
