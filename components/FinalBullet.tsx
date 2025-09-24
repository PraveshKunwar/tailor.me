"use client";

export default function FinalBullet({ text }: { text: string }) {
  if (!text) return null;

  return (
    <div className="text-sm leading-relaxed">
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <p className="text-gray-900 before:content-['•'] before:mr-2">{text}</p>
      </div>
    </div>
  );
}
