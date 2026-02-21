import React from 'react';
import styled from 'styled-components';
import { RecipeCard } from './RecipeCard';
import type { Recipe } from '../../types/Recipe';

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

interface RecipeListProps {
  recipes: Recipe[];
  onSelectRecipe: (id: string) => void;
}

export const RecipeList: React.FC<RecipeListProps> = ({ recipes, onSelectRecipe }) => {
  return (
    <Grid>
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          onClick={() => onSelectRecipe(recipe.id)}
        />
      ))}
    </Grid>
  );
};
