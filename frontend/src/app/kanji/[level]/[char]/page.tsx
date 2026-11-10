import { Suspense } from "react";
import KanjiDetail from "@/components/KanjiDetail";
import { Loading } from "@/components/ui";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <KanjiDetail />
    </Suspense>
  );
}
