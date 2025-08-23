"use client";
import { diffWords } from "diff";

export default function BulletDiff({
  original,
  rewritten,
}: {
  original: string;
  rewritten: string;
}) {
  const parts = diffWords(original || "", rewritten || "");
  return (
    <p className="text-sm leading-6">
      {parts.map((p, i) => (
        <span
          key={i}
          className={
            p.added
              ? "bg-green-200"
              : p.removed
              ? "bg-red-200 line-through"
              : ""
          }
        >
          {p.value}
        </span>
      ))}
    </p>
  );
}
