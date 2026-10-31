import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4f1ea",
        }}
      >
        <svg width="132" height="132" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="12.25" stroke="#1d1c19" strokeWidth="2.5" />
          <path
            d="M8.5 12.25h15M7 17h12.5M10.5 21.75h8.5"
            stroke="#1d1c19"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="23.5" cy="17" r="2.2" fill="#2950c4" />
        </svg>
      </div>
    ),
    size,
  );
}
