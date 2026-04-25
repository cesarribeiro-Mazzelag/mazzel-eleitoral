import { redirect } from "next/navigation";

// V2: raiz vai sempre pra plataforma nova
export default function RootPage() {
  redirect("/mazzel-preview");
}
