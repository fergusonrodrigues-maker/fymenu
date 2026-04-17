import { Suspense } from "react";
import EntrarClient from "./EntrarClient";

export default function EntrarPage() {
  return (
    <Suspense>
      <EntrarClient />
    </Suspense>
  );
}
