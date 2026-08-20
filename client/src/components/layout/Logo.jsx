import logo from "../../assets/logo.png";

const sizes = {
  xs:   { cls: "h-7 w-7",                 space: 5,  stroke: 3,  radius: 6  },
  sm:   { cls: "h-9 w-9",                 space: 7,  stroke: 3,  radius: 8  },
  md:   { cls: "h-10 w-10",               space: 8,  stroke: 4,  radius: 10 },
  lg:   { cls: "h-12 w-12",               space: 9,  stroke: 4,  radius: 12 },
  xl:   { cls: "h-16 w-16",               space: 10, stroke: 5,  radius: 14 },
  hero: { cls: "h-20 w-20 md:h-24 md:w-24", space: 10, stroke: 6, radius: 18 },
};

const gradientStyle = {
  background: "linear-gradient(135deg, #1B365D, #8B4513) border-box",
};

export default function Logo({ size = "md", className = "", framed = false }) {
  const s = sizes[size] || sizes.md;

  if (!framed) {
    return (
      <img
        src={logo}
        alt="TeamHub"
        className={`${s.cls} object-contain ${className}`}
      />
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center relative ${className}`}
      style={{ padding: `${s.space + s.stroke}px` }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          borderRadius: `${s.radius}px`,
          border: `${s.stroke}px solid transparent`,
          ...gradientStyle,
          WebkitMask:
            "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      <img
        src={logo}
        alt="TeamHub"
        className={`${s.cls} object-contain block relative z-10`}
      />
    </div>
  );
}
