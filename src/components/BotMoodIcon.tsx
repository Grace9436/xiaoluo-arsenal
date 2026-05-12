// A tiny looping mascot for the AI modal title.
// The robot body stays constant; only the six expression layers cycle.
export function BotMoodIcon() {
  return (
    <span className="bot-mood-icon" aria-hidden="true">
      <svg viewBox="0 0 64 64" role="img">
        <g className="bot-sticker-pop">
          <path
            className="bot-sticker-cut"
            d="M30 3h4c2 0 3.7 1.6 3.7 3.7v5.4c4.5.5 8.7 2 12 4.6 4.3 3.4 6.4 8.4 6.4 15v9c0 10.5-7.4 16.2-21.1 16.2h-6.1C15.3 57 7.9 51.2 7.9 40.7v-9c0-6.6 2.1-11.6 6.4-15 3.4-2.6 7.5-4.1 12-4.6V6.7C26.3 4.6 28 3 30 3Z"
          />
          <g className="bot-antenna">
            <path d="M32 10V5" />
            <circle cx="32" cy="4.8" r="4.2" />
          </g>
          <g className="bot-ears">
            <rect x="4.5" y="27" width="9" height="16" rx="3" />
            <rect x="50.5" y="27" width="9" height="16" rx="3" />
          </g>
          <rect className="bot-head" x="11" y="15" width="42" height="40" rx="11" />
          <g className="bot-face bot-face-happy">
            <path d="M21 33c2-5 7-5 9 0" />
            <path d="M34 33c2-5 7-5 9 0" />
            <path d="M24 41c5 4 12 4 17 0" />
          </g>
          <g className="bot-face bot-face-confused">
            <circle cx="25" cy="32" r="4.4" />
            <circle cx="39" cy="32" r="4.4" />
            <circle cx="27" cy="30.8" r="1.5" />
            <circle cx="41" cy="33.2" r="1.5" />
            <path d="M24 43h16" />
            <text x="47" y="20">?</text>
          </g>
          <g className="bot-face bot-face-shocked">
            <circle cx="25" cy="31" r="5.5" />
            <circle cx="39" cy="31" r="5.5" />
            <circle cx="25" cy="31" r="1.8" />
            <circle cx="39" cy="31" r="1.8" />
            <rect x="27" y="40" width="10" height="9" rx="2" />
            <path className="bot-expression-mark" d="M8 18l6 6M56 18l-6 6M54 9l-8 10" />
          </g>
          <g className="bot-face bot-face-thinking">
            <path d="M20 31c3-4 7-4 10 0" />
            <path d="M34 31c3-4 7-4 10 0" />
            <circle cx="27" cy="32" r="1.5" />
            <circle cx="37" cy="30" r="1.5" />
            <path d="M26 45c4-2 8-2 12 0" />
            <path className="bot-hand" d="M16 47c3-6 7-8 12-8" />
          </g>
          <g className="bot-face bot-face-angry">
            <path d="M20 28l9 4" />
            <path d="M44 28l-9 4" />
            <circle cx="25" cy="34" r="2.2" />
            <circle cx="39" cy="34" r="2.2" />
            <path d="M25 46c5-4 10-4 15 0" />
            <path className="bot-expression-mark" d="M48 13l5 5-5 5-5-5z" />
          </g>
          <g className="bot-face bot-face-smug">
            <path d="M20 31c3-3 7-3 10 0" />
            <path d="M34 31c3-3 7-3 10 0" />
            <circle cx="26" cy="33" r="1.5" />
            <circle cx="38" cy="33" r="1.5" />
            <path d="M26 43c5 3 10 2 14-3" />
            <path className="bot-expression-mark" d="M52 12l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" />
          </g>
        </g>
      </svg>
    </span>
  );
}
