import React from "react";
import { HiArrowPath } from "react-icons/hi2";
import { nodeToText, parseListItem } from "../../../utils/courseMarkdownUtils";

interface SquareFlipCardProps {
  items: React.ReactNode[];
}

type FlipCardItem = {
  front: string;
  back: string;
};

// Render list-flip items as click-to-flip flash cards.
const SquareFlipCard: React.FC<SquareFlipCardProps> = ({ items }) => {
  const [flippedCards, setFlippedCards] = React.useState<
    Record<number, boolean>
  >({});

  // Derive front/back texts from markdown list items.
  const cards = React.useMemo<FlipCardItem[]>(() => {
    if (!items || items.length === 0) return [];
    return items.map((item) => {
      const { title, description } = parseListItem(nodeToText(item));
      return { front: title, back: description };
    });
  }, [items]);

  // Toggle one card between front and back sides.
  const toggleCard = (cardIndex: number) => {
    setFlippedCards((previous) => ({
      ...previous,
      [cardIndex]: !previous[cardIndex],
    }));
  };

  return (
    <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
      {cards.map((card, index) => {
        const isFlipped = !!flippedCards[index];

        return (
          <button
            key={`${card.front}-${index}`}
            type="button"
            onClick={() => toggleCard(index)}
            className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00be73] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212]"
            aria-label={`Flip card ${index + 1}: ${card.front}`}
          >
            <div
              className="relative"
              style={{
                width: "min(300px, 80vw)",
                height: "min(300px, 80vw)",
                perspective: "1200px",
                WebkitPerspective: "1200px",
              }}
            >
              <div
                className="relative h-full w-full transition-transform duration-500 ease-out"
                style={{
                  transformStyle: "preserve-3d",
                  WebkitTransformStyle:
                    "preserve-3d" as React.CSSProperties["WebkitTransformStyle"],
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-[#00be73]/20 bg-gradient-to-br from-[#00be73]/20 via-[#00be73]/10 to-[#026e99]/10 px-6 py-8 text-center shadow-xl backdrop-blur-sm transition-all duration-300 group-hover:border-[#00be73]/40"
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility:
                      "hidden" as React.CSSProperties["WebkitBackfaceVisibility"],
                  }}
                >
                  <HiArrowPath
                    className="absolute right-3 top-3 text-[#00be73]/50 transition-all duration-300 group-hover:text-[#00be73] group-hover:scale-110"
                    size={20}
                  />
                  <p className="text-base font-bold leading-relaxed text-white sm:text-lg">
                    {card.front}
                  </p>
                </div>
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-[#00be73]/20 bg-[#121212] px-6 py-8 text-center shadow-xl backdrop-blur-sm transition-all duration-300 group-hover:border-[#00be73]/40"
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility:
                      "hidden" as React.CSSProperties["WebkitBackfaceVisibility"],
                    transform: "rotateY(180deg)",
                  }}
                >
                  <HiArrowPath
                    className="absolute right-3 top-3 text-[#00be73]/50 transition-all duration-300 group-hover:text-[#00be73] group-hover:rotate-180 group-hover:scale-110"
                    size={20}
                  />
                  <p className="max-h-[70%] overflow-y-auto text-xs leading-relaxed text-white/70 sm:text-base">
                    {card.back}
                  </p>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default SquareFlipCard;
