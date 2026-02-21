import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { getAccessibleRecipeById, incrementPublicRecipeViews, incrementPublicRecipeCopies } from '../firebase/recipeSync';
import { useAuth } from '../firebase';
import { useRecipeStore } from '../stores/recipeStore';
import { generateId, formatTime, formatQuantity, isRTL, type Recipe, type RecipeLanguage } from '../types/Recipe';
import { SEO } from '../components/SEO';
import { generateRecipePlaceholder } from '../utils/recipePlaceholder';
import { sanitize } from '../utils/sanitize';

const colors = {
  primary: '#2C3E50',
  primaryDark: '#1a252f',
  backgroundLight: '#F0F4F8',
  surface: '#ffffff',
  textMain: '#333333',
  textMuted: '#64748b',
  green500: '#22c55e',
  amber500: '#f59e0b',
};

const Container = styled.div<{ $rtl?: boolean }>`
  min-height: 100vh;
  background: ${colors.backgroundLight};
  direction: ${(props) => (props.$rtl ? 'rtl' : 'ltr')};
  text-align: ${(props) => (props.$rtl ? 'right' : 'left')};
`;

const LoadingContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 16px;
  color: ${colors.textMuted};
`;

const ErrorContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  text-align: center;
`;

const ErrorIcon = styled.span`
  font-size: 64px;
  color: ${colors.textMuted};
`;

const ErrorTitle = styled.h1`
  font-size: 24px;
  color: ${colors.textMain};
  margin: 0;
`;

const ErrorDescription = styled.p`
  font-size: 16px;
  color: ${colors.textMuted};
  margin: 0;
  max-width: 400px;
`;

const HeroSection = styled.div`
  position: relative;
  width: 100%;
  height: 300px;
  overflow: hidden;

  @media (min-width: 768px) {
    height: 400px;
  }
`;

const HeroImage = styled.div<{ $image?: string }>`
  width: 100%;
  height: 100%;
  background: ${(props) =>
    props.$image
      ? `url("${props.$image.replace(/"/g, '%22')}") center/cover`
      : `linear-gradient(135deg, ${colors.backgroundLight} 0%, #e0e0e0 100%)`};
`;

const HeroOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6) 0%, transparent 50%);
`;

const ContentWrapper = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
  margin-top: -80px;
  position: relative;
  z-index: 1;
`;

const Card = styled.div`
  background: ${colors.surface};
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 20px 40px -10px rgba(44, 62, 80, 0.15);
`;

const RecipeTitle = styled.h1`
  font-size: 32px;
  font-weight: 900;
  color: ${colors.textMain};
  margin: 0 0 8px;
  font-family: 'Playfair Display', Georgia, serif;

  @media (min-width: 768px) {
    font-size: 42px;
  }
`;

const RecipeDescription = styled.p`
  font-size: 18px;
  color: ${colors.textMuted};
  margin: 0 0 24px;
  line-height: 1.6;
`;

const SharedByText = styled.p`
  font-size: 14px;
  color: ${colors.textMuted};
  margin: 0 0 24px;
`;

const MetaRow = styled.div`
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e0e0e0;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${colors.textMuted};

  .material-symbols-outlined {
    color: ${colors.primary};
    font-size: 20px;
  }
`;

const SectionTitle = styled.h2`
  font-size: 22px;
  font-weight: 700;
  color: ${colors.textMain};
  margin: 32px 0 16px;
  font-family: 'Playfair Display', Georgia, serif;
`;

const IngredientsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const IngredientItem = styled.li`
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  gap: 8px;

  &:last-child {
    border-bottom: none;
  }
`;

const IngredientQuantity = styled.span`
  font-weight: 600;
  color: ${colors.primary};
  min-width: 80px;
`;

const StepsList = styled.ol`
  list-style: none;
  padding: 0;
  margin: 0;
  counter-reset: step-counter;
`;

const StepItem = styled.li`
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
  counter-increment: step-counter;
  display: flex;
  gap: 16px;

  &:last-child {
    border-bottom: none;
  }

  &::before {
    content: counter(step-counter);
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    height: 32px;
    background: ${colors.primary};
    color: white;
    border-radius: 50%;
    font-weight: 700;
    font-size: 14px;
  }
`;

const StepContent = styled.div`
  flex: 1;
`;

const ActionSection = styled.div`
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
`;

const AddButton = styled.button<{ $success?: boolean }>`
  padding: 16px 32px;
  border: none;
  border-radius: 12px;
  background: ${(props) => (props.$success ? colors.green500 : colors.primary)};
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) => (props.$success ? colors.green500 : colors.primaryDark)};
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .material-symbols-outlined {
    font-size: 20px;
  }
`;

const SignUpPrompt = styled.p`
  font-size: 14px;
  color: ${colors.textMuted};
  margin: 0;
`;

export function PublicRecipePage() {
  // Support both recipeId (new) and shareId (legacy) in the URL
  const { recipeId, shareId } = useParams<{ recipeId?: string; shareId?: string }>();
  const id = recipeId || shareId;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const addRecipe = useRecipeStore((state) => state.addRecipe);

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'not_found' | 'no_longer_shared' | null>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const rtl = recipe ? isRTL(recipe.language as RecipeLanguage) : false;

  useEffect(() => {
    const fetchRecipe = async () => {
      if (!id) {
        setError('not_found');
        setLoading(false);
        return;
      }

      try {
        const data = await getAccessibleRecipeById(id);
        if (!data) {
          setError('not_found');
        } else {
          setRecipe(data);
          // Increment view count (fire and forget)
          incrementPublicRecipeViews(id);
        }
      } catch (err) {
        console.error('Failed to fetch accessible recipe:', err);
        setError('not_found');
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [id]);

  const handleAddToMyRecipes = async () => {
    if (!recipe || !user || adding || added) return;

    setAdding(true);
    try {
      // Clone the recipe to user's collection
      const newRecipe = addRecipe({
        title: recipe.title,
        description: recipe.description,
        image: recipe.image,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        difficulty: recipe.difficulty,
        defaultServings: recipe.defaultServings,
        ingredients: recipe.ingredients.map((ing) => ({
          ...ing,
          id: generateId('ing'),
        })),
        steps: recipe.steps.map((step, idx) => ({
          ...step,
          id: generateId('step'),
          order: idx + 1,
        })),
        tags: recipe.tags,
        category: recipe.category,
        author: recipe.author,
        sourceUrl: recipe.sourceUrl,
        nutrition: recipe.nutrition,
        chefTip: recipe.chefTip,
        language: recipe.language,
      });

      // Increment copies count on original (fire and forget)
      if (id) {
        incrementPublicRecipeCopies(id);
      }

      setAdded(true);
      // Navigate to the new recipe after a short delay
      setTimeout(() => {
        navigate(`/recipes/${newRecipe.id}`);
      }, 1500);
    } catch (err) {
      console.error('Failed to add recipe:', err);
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <LoadingContainer>
        <span className="material-symbols-outlined" style={{ fontSize: 48 }}>
          hourglass_empty
        </span>
        <span>{t('common.loading')}</span>
      </LoadingContainer>
    );
  }

  if (error === 'not_found') {
    return (
      <ErrorContainer>
        <ErrorIcon className="material-symbols-outlined">search_off</ErrorIcon>
        <ErrorTitle>{t('share.recipeNotFound')}</ErrorTitle>
        <ErrorDescription>{t('share.recipeNotFoundDesc')}</ErrorDescription>
      </ErrorContainer>
    );
  }

  if (error === 'no_longer_shared') {
    return (
      <ErrorContainer>
        <ErrorIcon className="material-symbols-outlined">lock</ErrorIcon>
        <ErrorTitle>{t('share.recipeNoLongerShared')}</ErrorTitle>
        <ErrorDescription>{t('share.recipeNoLongerSharedDesc')}</ErrorDescription>
      </ErrorContainer>
    );
  }

  if (!recipe) {
    return null;
  }

  const totalTime = recipe.prepTime + recipe.cookTime;

  return (
    <Container $rtl={rtl}>
      <SEO
        title={recipe.title}
        description={recipe.description}
        ogImage={recipe.image}
        canonical={`/recipe/${id}`}
        type="article"
      />

      <HeroSection>
        <HeroImage $image={recipe.image || generateRecipePlaceholder(recipe.id, recipe.title)} />
        <HeroOverlay />
      </HeroSection>

      <ContentWrapper>
        <Card>
          <RecipeTitle>{sanitize(recipe.title)}</RecipeTitle>
          <RecipeDescription>{sanitize(recipe.description)}</RecipeDescription>

          {recipe.author && (
            <SharedByText>
              {t('share.sharedBy')} {recipe.author}
            </SharedByText>
          )}

          <MetaRow>
            <MetaItem>
              <span className="material-symbols-outlined">schedule</span>
              {formatTime(totalTime)}
            </MetaItem>
            <MetaItem>
              <span className="material-symbols-outlined">restaurant</span>
              {recipe.defaultServings} {t('recipe.servings')}
            </MetaItem>
            <MetaItem>
              <span className="material-symbols-outlined">bar_chart</span>
              {t(`recipe.difficulties.${recipe.difficulty}`)}
            </MetaItem>
          </MetaRow>

          <SectionTitle>{t('recipe.ingredients')}</SectionTitle>
          <IngredientsList>
            {recipe.ingredients.map((ing) => (
              <IngredientItem key={ing.id}>
                <IngredientQuantity>
                  {formatQuantity(ing.quantity)} {ing.unit}
                </IngredientQuantity>
                <span>{ing.name}</span>
              </IngredientItem>
            ))}
          </IngredientsList>

          <SectionTitle>{t('recipe.instructions')}</SectionTitle>
          <StepsList>
            {recipe.steps.map((step) => (
              <StepItem key={step.id}>
                <StepContent>{sanitize(step.description)}</StepContent>
              </StepItem>
            ))}
          </StepsList>

          {recipe.chefTip && (
            <>
              <SectionTitle>{t('recipe.chefTips')}</SectionTitle>
              <p style={{ color: colors.textMuted, lineHeight: 1.6 }}>
                {sanitize(recipe.chefTip)}
              </p>
            </>
          )}

          <ActionSection>
            {user ? (
              <AddButton
                onClick={handleAddToMyRecipes}
                disabled={adding || added}
                $success={added}
              >
                <span className="material-symbols-outlined">
                  {added ? 'check' : adding ? 'hourglass_empty' : 'library_add'}
                </span>
                {added
                  ? t('share.addedToMyRecipes')
                  : t('share.addToMyRecipes')}
              </AddButton>
            ) : (
              <>
                <AddButton onClick={() => navigate('/')}>
                  <span className="material-symbols-outlined">login</span>
                  {t('share.signUpToSave')}
                </AddButton>
                <SignUpPrompt>
                  {t('share.signUpToSave')}
                </SignUpPrompt>
              </>
            )}
          </ActionSection>
        </Card>
      </ContentWrapper>
    </Container>
  );
}
