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
    <div className="text-sm leading-relaxed">
      {parts.map((part, index) => {
        if (part.added) {
          return (
            <span
              key={index}
              className="bg-green-100 text-green-800 px-1 py-0.5 rounded font-medium"
            >
              +{part.value}
            </span>
          );
        }
        if (part.removed) {
          return (
            <span
              key={index}
              className="bg-red-100 text-red-800 px-1 py-0.5 rounded line-through font-medium"
            >
              -{part.value}
            </span>
          );
        }
        return (
          <span key={index} className="text-gray-700">
            {part.value}
          </span>
        );
      })}
    </div>
  );
}
