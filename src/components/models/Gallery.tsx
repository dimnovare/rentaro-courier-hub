"use client";

import { useState } from "react";

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const main = images[active] ?? images[0];
  return (
    <div>
      <div className="model-pic detail-main">
        <img src={main} alt={alt} />
      </div>
      {images.length > 1 && (
        <div className="gallery-thumbs">
          {images.map((src, i) => (
            <button
              key={src}
              className="gallery-thumb"
              data-active={i === active}
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1} of ${images.length}`}
            >
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
