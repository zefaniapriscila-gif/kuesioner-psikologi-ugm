import React from "react";

interface BrewCupCompanionProps {
  progress: number; // 0 to 1
  isNudged: boolean;
  isSent: boolean;
  answeredCount: number;
  totalCount: number;
}

export const BrewCupCompanion: React.FC<BrewCupCompanionProps> = ({
  progress,
  isNudged,
  isSent,
  answeredCount,
  totalCount,
}) => {
  const pct = Math.round(progress * 100);
  // Liquid y inside the SVG viewBox (0..160, cup interior is y=34..144)
  const liquidTopY = Math.round(138 - progress * 92);

  return (
    <div
      className={`cup-companion ${isNudged ? "is-nudged" : ""} ${
        isSent ? "is-sent" : ""
      }`}
      aria-hidden="true"
    >
      {/* Live Recipe Readout Tag */}
      <div className="cup-tag">
        <span className="cup-tag-pct">{pct}% Terisi</span>
        <span className="cup-tag-sub">
          {answeredCount}/{totalCount} butir &middot;{" "}
          {pct >= 100
            ? "Siap disajikan"
            : pct >= 50
            ? "Normal Sweet"
            : "Sedang diseduh"}
        </span>
      </div>

      {/* Tactile SVG Glass Cup with Rising Caramel Liquid, Ice Cubes & Boba */}
      <div className="cup-art-wrap">
        <svg
          className="cup-svg"
          viewBox="0 0 150 165"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <clipPath id="cupInteriorClip">
              <path d="M30 34 L120 34 L108 144 C107 151 101 155 94 155 L56 155 C49 155 43 151 42 144 Z" />
            </clipPath>
            <linearGradient id="syrupGrad" x1="75" y1="34" x2="75" y2="155" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F5A638" />
              <stop offset="55%" stopColor="#D16B1A" />
              <stop offset="100%" stopColor="#7C2D08" />
            </linearGradient>
            <linearGradient id="glassShine" x1="26" y1="30" x2="124" y2="155" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(255,255,255,0.65)" />
              <stop offset="45%" stopColor="rgba(255,255,255,0.18)" />
              <stop offset="100%" stopColor="rgba(255,240,215,0.35)" />
            </linearGradient>
          </defs>

          {/* Diagonal Striped Straw */}
          <g className="cup-straw">
            <path
              d="M98 8 L112 6 L82 146 L70 144 Z"
              fill="#FFFDF9"
              stroke="rgba(28,19,14,0.22)"
              strokeWidth="1.5"
            />
            <path d="M96 18 L109 16 L106 28 L93 30 Z" fill="#D9534F" />
            <path d="M91 42 L104 40 L101 52 L88 54 Z" fill="#D9534F" />
            <path d="M86 66 L99 64 L96 76 L83 78 Z" fill="#D9534F" />
            <path d="M81 90 L94 88 L91 100 L78 102 Z" fill="#D9534F" />
          </g>

          {/* Falling Sugar Cube (animates on each answer click) */}
          <g className="cup-falling-sugar">
            <rect
              x="56"
              y="8"
              width="18"
              height="18"
              rx="4"
              transform="rotate(-14 65 17)"
              fill="#FFFDF9"
              stroke="#E6C38E"
              strokeWidth="1.5"
            />
          </g>

          {/* Clipped Interior: Rising Liquid + Floating Ice Cubes + Boba Pearls */}
          <g clipPath="url(#cupInteriorClip)">
            {/* Glass Back Tint */}
            <rect x="24" y="30" width="102" height="130" fill="rgba(255, 248, 236, 0.38)" />

            {/* Rising Caramel / Gula Aren Liquid */}
            <g
              className="cup-liquid-group"
              style={{
                transform: `translateY(${liquidTopY - 46}px)`,
                transition: "transform 0.65s cubic-bezier(0.34, 1.4, 0.64, 1)",
              }}
            >
              {/* Foam Crest */}
              <path
                d="M20 46 Q48 39 75 46 T130 46 L130 60 L20 60 Z"
                fill="#FCE3B4"
              />
              {/* Main Syrup Body */}
              <path
                d="M20 50 Q48 44 75 50 T130 50 L130 210 L20 210 Z"
                fill="url(#syrupGrad)"
              />

              {/* Floating Ice Cubes riding the liquid meniscus */}
              <rect
                x="42"
                y="42"
                width="24"
                height="22"
                rx="5"
                transform="rotate(-10 54 53)"
                fill="rgba(255, 255, 255, 0.78)"
                stroke="rgba(255, 255, 255, 0.92)"
                strokeWidth="1.2"
              />
              <rect
                x="76"
                y="45"
                width="22"
                height="20"
                rx="5"
                transform="rotate(12 87 55)"
                fill="rgba(255, 255, 255, 0.72)"
                stroke="rgba(255, 255, 255, 0.9)"
                strokeWidth="1.2"
              />
            </g>

            {/* Chewy Boba Pearls at Bottom of Cup */}
            <g className="cup-boba-group">
              <circle cx="52" cy="146" r="6.5" fill="#2A1207" />
              <circle cx="67" cy="148" r="7" fill="#230E05" />
              <circle cx="83" cy="147" r="6.5" fill="#2A1207" />
              <circle cx="96" cy="145" r="6" fill="#36180A" />
              <circle cx="59" cy="135" r="6" fill="#36180A" />
              <circle cx="75" cy="136" r="6.5" fill="#2A1207" />
              <circle cx="90" cy="134" r="6" fill="#230E05" />
              {/* Tiny specular dots on boba */}
              <circle cx="50" cy="144" r="1.8" fill="rgba(255,235,210,0.5)" />
              <circle cx="65" cy="146" r="1.8" fill="rgba(255,235,210,0.5)" />
              <circle cx="81" cy="145" r="1.8" fill="rgba(255,235,210,0.5)" />
              <circle cx="73" cy="134" r="1.8" fill="rgba(255,235,210,0.5)" />
            </g>
          </g>

          {/* Outer Glass Rim & Walls */}
          <path
            d="M30 34 L120 34 L108 144 C107 151 101 155 94 155 L56 155 C49 155 43 151 42 144 Z"
            fill="url(#glassShine)"
            stroke="currentColor"
            strokeOpacity="0.28"
            strokeWidth="2.5"
          />
          {/* Top Rim Ellipse */}
          <ellipse
            cx="75"
            cy="34"
            rx="46"
            ry="6.5"
            fill="rgba(255, 253, 248, 0.65)"
            stroke="currentColor"
            strokeOpacity="0.35"
            strokeWidth="2.2"
          />
          {/* Vertical Glass Specular Highlight */}
          <path
            d="M38 45 L47 138"
            stroke="rgba(255, 255, 255, 0.75)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
};
