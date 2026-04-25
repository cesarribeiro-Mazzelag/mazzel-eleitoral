import "@/components/plataforma-v2/platform.css";
import "@/components/plataforma-v2/campanha.css";
import { Shell } from "@/components/plataforma-v2/Shell";

export default function MazzelPreviewLayout({ children }) {
  return <Shell alertCount={7}>{children}</Shell>;
}
