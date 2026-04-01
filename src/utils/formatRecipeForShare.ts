import type { Recipe } from '../types/Recipe';
import { formatQuantity, formatTime, isRTL, scaleQuantity } from '../types/Recipe';

export function formatRecipeForShare(recipe: Recipe, scale: number = 1): string {
  const rtl = isRTL(recipe.language);
  const lines: string[] = [];

  // Title
  lines.push(`🍳 ${recipe.title}`);
  lines.push('');

  // Description (if brief)
  if (recipe.description && recipe.description.length < 200) {
    lines.push(recipe.description);
    lines.push('');
  }

  // Quick stats
  const totalTime = recipe.prepTime + recipe.cookTime;
  const servings = Math.round(recipe.defaultServings * scale);
  const servingsLabel = rtl ? 'מנות' : 'servings';
  lines.push(`⏱️ ${formatTime(totalTime)} | 👥 ${servings} ${servingsLabel}`);
  lines.push('');

  // Ingredients
  const ingredientsHeader = rtl ? 'מצרכים' : 'Ingredients';
  lines.push(`🥘 ${ingredientsHeader}:`);
  lines.push('─'.repeat(20));

  recipe.ingredients.forEach((ing) => {
    const qty = formatQuantity(scaleQuantity(ing.quantity, scale));
    let line = `• ${qty} ${ing.unit} ${ing.name}`;
    if (ing.notes) line += ` (${ing.notes})`;
    lines.push(line);
  });
  lines.push('');

  // Steps
  const stepsHeader = rtl ? 'הוראות הכנה' : 'Instructions';
  lines.push(`📝 ${stepsHeader}:`);
  lines.push('─'.repeat(20));

  recipe.steps
    .sort((a, b) => a.order - b.order)
    .forEach((step, index) => {
      lines.push(`${index + 1}. ${step.description}`);
      if (step.timer && step.timer >= 60) {
        const mins = Math.round(step.timer / 60);
        lines.push(`   ⏰ ${mins} ${rtl ? 'דקות' : 'min'}`);
      }
    });

  // Footer
  lines.push('');
  lines.push(rtl ? '👨‍🍳 נשלח מ-Duckbook' : '👨‍🍳 Shared from Duckbook');

  return lines.join('\n');
}
