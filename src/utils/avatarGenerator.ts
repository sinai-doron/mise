/**
 * Generate a unique avatar URL using DiceBear's lorelei style.
 * Uses the DiceBear API to create artistic illustrated faces.
 *
 * @param seed - A unique identifier (e.g., collection ID) to generate a consistent avatar
 * @returns URL string for the generated avatar SVG
 */
export const generateAvatar = (seed: string): string => {
  // Use the lorelei style for elegant, artistic illustrated faces
  return `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(seed)}`;
};
