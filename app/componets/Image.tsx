import { Spinner } from "@radix-ui/themes";
import { useState } from "react";

export function Image({ imageUrl, emoteName }: { imageUrl: string; emoteName: string }) {
  const [loading, setLoading] = useState(true);
  return (
    <Spinner loading={loading}>
      <img src={imageUrl} alt={emoteName} className="object-contain" style={{ height: "100%" }} onLoad={() => setLoading(false)} />
    </Spinner>
  );
}
