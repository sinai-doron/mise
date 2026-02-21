import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { ImageUploader } from './ImageUploader';
import type { Recipe, Ingredient, RecipeStep, Difficulty, IngredientCategory, RecipeLanguage } from '../../types/Recipe';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
`;

const Modal = styled.div`
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  color: #666;

  &:hover {
    color: #333;
  }

  .material-symbols-outlined {
    font-size: 24px;
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
`;

const Section = styled.div`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 6px;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #f59e0b;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  min-height: 80px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #f59e0b;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  background: white;

  &:focus {
    outline: none;
    border-color: #f59e0b;
  }
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
`;

const IngredientRow = styled.div`
  display: grid;
  grid-template-columns: 80px 80px 1fr auto auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
`;

const SmallInput = styled(Input)`
  padding: 8px 10px;
`;

const SmallSelect = styled(Select)`
  padding: 8px 10px;
`;

const IconButton = styled.button`
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  color: #666;
  transition: all 0.15s;

  &:hover {
    background: #e0e0e0;
  }

  .material-symbols-outlined {
    font-size: 18px;
  }
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px dashed #e0e0e0;
  border-radius: 8px;
  background: white;
  color: #666;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: #f59e0b;
    color: #f59e0b;
  }

  .material-symbols-outlined {
    font-size: 18px;
  }
`;

const StepRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-bottom: 12px;
`;

const StepNumber = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #f59e0b;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
  margin-top: 8px;
`;

const StepContent = styled.div`
  flex: 1;
`;

const StepTextArea = styled(TextArea)`
  min-height: 60px;
`;

const StepMeta = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
`;

const StepMetaInput = styled(SmallInput)`
  max-width: 120px;
`;

const Footer = styled.div`
  padding: 16px 24px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
`;

const Button = styled.button<{ $primary?: boolean }>`
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  background: ${(props) => (props.$primary ? '#f59e0b' : '#f0f0f0')};
  color: ${(props) => (props.$primary ? 'white' : '#666')};

  &:hover {
    background: ${(props) => (props.$primary ? '#d97706' : '#e0e0e0')};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CATEGORIES: IngredientCategory[] = ['produce', 'dairy', 'meat', 'pantry', 'frozen', 'bakery', 'spices', 'other'];
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const LANGUAGES: { code: RecipeLanguage; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'he', label: 'עברית', flag: '🇮🇱' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'fa', label: 'فارسی', flag: '🇮🇷' },
  { code: 'ur', label: 'اردو', flag: '🇵🇰' },
];

interface RecipeFormProps {
  recipe?: Recipe;
  onSave: (data: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

interface IngredientFormData {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  category: IngredientCategory;
  notes: string;
}

interface StepFormData {
  id: string;
  description: string;
  timer: string;
  tips: string;
}

export const RecipeForm: React.FC<RecipeFormProps> = ({ recipe, onSave, onClose }) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState(recipe?.title ?? '');
  const [description, setDescription] = useState(recipe?.description ?? '');
  const [image, setImage] = useState(recipe?.image ?? '');
  const [prepTime, setPrepTime] = useState(recipe?.prepTime?.toString() ?? '15');
  const [cookTime, setCookTime] = useState(recipe?.cookTime?.toString() ?? '30');
  const [difficulty, setDifficulty] = useState<Difficulty>(recipe?.difficulty ?? 'medium');
  const [defaultServings, setDefaultServings] = useState(recipe?.defaultServings?.toString() ?? '4');
  const [category, setCategory] = useState(recipe?.category ?? 'Main Dishes');
  const [tags, setTags] = useState(recipe?.tags?.join(', ') ?? '');
  const [language, setLanguage] = useState<RecipeLanguage>(recipe?.language ?? 'en');

  const [ingredients, setIngredients] = useState<IngredientFormData[]>(
    recipe?.ingredients?.map((ing) => ({
      id: ing.id,
      name: ing.name,
      quantity: ing.quantity.toString(),
      unit: ing.unit,
      category: ing.category,
      notes: ing.notes ?? '',
    })) ?? [{ id: crypto.randomUUID(), name: '', quantity: '1', unit: '', category: 'pantry', notes: '' }]
  );

  const [steps, setSteps] = useState<StepFormData[]>(
    recipe?.steps?.map((step) => ({
      id: step.id,
      description: step.description,
      timer: step.timer?.toString() ?? '',
      tips: step.tips ?? '',
    })) ?? [{ id: crypto.randomUUID(), description: '', timer: '', tips: '' }]
  );

  const addIngredient = () => {
    setIngredients([...ingredients, { id: crypto.randomUUID(), name: '', quantity: '1', unit: '', category: 'pantry', notes: '' }]);
  };

  const removeIngredient = (id: string) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((ing) => ing.id !== id));
    }
  };

  const updateIngredient = (id: string, field: keyof IngredientFormData, value: string) => {
    setIngredients(ingredients.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing)));
  };

  const addStep = () => {
    setSteps([...steps, { id: crypto.randomUUID(), description: '', timer: '', tips: '' }]);
  };

  const removeStep = (id: string) => {
    if (steps.length > 1) {
      setSteps(steps.filter((step) => step.id !== id));
    }
  };

  const updateStep = (id: string, field: keyof StepFormData, value: string) => {
    setSteps(steps.map((step) => (step.id === id ? { ...step, [field]: value } : step)));
  };

  const handleSubmit = () => {
    const formattedIngredients: Ingredient[] = ingredients
      .filter((ing) => ing.name.trim())
      .map((ing) => ({
        id: ing.id,
        name: ing.name.trim(),
        quantity: parseFloat(ing.quantity) || 1,
        unit: ing.unit.trim(),
        category: ing.category,
        notes: ing.notes.trim() || undefined,
      }));

    const formattedSteps: RecipeStep[] = steps
      .filter((step) => step.description.trim())
      .map((step, index) => ({
        id: step.id,
        order: index + 1,
        description: step.description.trim(),
        timer: step.timer ? parseInt(step.timer) * 60 : undefined,
        tips: step.tips.trim() || undefined,
      }));

    const formattedTags = tags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    onSave({
      title: title.trim(),
      description: description.trim(),
      image: image || undefined,
      prepTime: parseInt(prepTime) || 15,
      cookTime: parseInt(cookTime) || 30,
      difficulty,
      defaultServings: parseInt(defaultServings) || 4,
      ingredients: formattedIngredients,
      steps: formattedSteps,
      tags: formattedTags,
      category: category.trim() || 'Main Dishes',
      language,
    });
  };

  const isValid = title.trim() && ingredients.some((ing) => ing.name.trim()) && steps.some((step) => step.description.trim());

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>{recipe ? t('recipe.form.editRecipe') : t('recipe.form.newRecipe')}</Title>
          <CloseButton onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </CloseButton>
        </Header>

        <Content>
          <Section>
            <SectionTitle>{t('recipe.form.basicInfo')}</SectionTitle>
            <FormGroup>
              <Label>{t('recipe.title')} *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('recipe.form.recipeTitle')}
              />
            </FormGroup>
            <FormGroup>
              <Label>{t('recipe.description')}</Label>
              <TextArea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('recipe.form.briefDescription')}
              />
            </FormGroup>
            <FormGroup>
              <ImageUploader value={image} onChange={setImage} />
            </FormGroup>
            <Row>
              <FormGroup>
                <Label>{t('recipe.prepTimeMin')}</Label>
                <Input
                  type="number"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  min="0"
                />
              </FormGroup>
              <FormGroup>
                <Label>{t('recipe.cookTimeMin')}</Label>
                <Input
                  type="number"
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                  min="0"
                />
              </FormGroup>
              <FormGroup>
                <Label>{t('recipe.servings')}</Label>
                <Input
                  type="number"
                  value={defaultServings}
                  onChange={(e) => setDefaultServings(e.target.value)}
                  min="1"
                />
              </FormGroup>
            </Row>
            <Row>
              <FormGroup>
                <Label>{t('recipe.difficulty')}</Label>
                <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {t(`recipe.difficulties.${d}`)}
                    </option>
                  ))}
                </Select>
              </FormGroup>
              <FormGroup>
                <Label>{t('recipe.category')}</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder={t('recipe.form.categoryPlaceholder')}
                />
              </FormGroup>
              <FormGroup>
                <Label>{t('recipe.language')}</Label>
                <Select value={language} onChange={(e) => setLanguage(e.target.value as RecipeLanguage)}>
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.label}
                    </option>
                  ))}
                </Select>
              </FormGroup>
            </Row>
            <FormGroup>
              <Label>{t('recipe.tags')}</Label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder={t('recipe.form.tagsPlaceholder')}
              />
            </FormGroup>
          </Section>

          <Section>
            <SectionTitle>{t('recipe.ingredients')} *</SectionTitle>
            {ingredients.map((ing) => (
              <IngredientRow key={ing.id}>
                <SmallInput
                  placeholder={t('recipe.form.qty')}
                  value={ing.quantity}
                  onChange={(e) => updateIngredient(ing.id, 'quantity', e.target.value)}
                />
                <SmallInput
                  placeholder={t('recipe.form.unit')}
                  value={ing.unit}
                  onChange={(e) => updateIngredient(ing.id, 'unit', e.target.value)}
                />
                <SmallInput
                  placeholder={t('recipe.form.ingredientName')}
                  value={ing.name}
                  onChange={(e) => updateIngredient(ing.id, 'name', e.target.value)}
                />
                <SmallSelect
                  value={ing.category}
                  onChange={(e) => updateIngredient(ing.id, 'category', e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {t(`recipe.categories.${cat}`)}
                    </option>
                  ))}
                </SmallSelect>
                <IconButton onClick={() => removeIngredient(ing.id)}>
                  <span className="material-symbols-outlined">delete</span>
                </IconButton>
              </IngredientRow>
            ))}
            <AddButton onClick={addIngredient}>
              <span className="material-symbols-outlined">add</span>
              {t('recipe.form.addIngredient')}
            </AddButton>
          </Section>

          <Section>
            <SectionTitle>{t('recipe.instructions')} *</SectionTitle>
            {steps.map((step, index) => (
              <StepRow key={step.id}>
                <StepNumber>{index + 1}</StepNumber>
                <StepContent>
                  <StepTextArea
                    placeholder={t('recipe.form.describeStep')}
                    value={step.description}
                    onChange={(e) => updateStep(step.id, 'description', e.target.value)}
                  />
                  <StepMeta>
                    <StepMetaInput
                      placeholder={t('recipe.form.timerMin')}
                      type="number"
                      value={step.timer}
                      onChange={(e) => updateStep(step.id, 'timer', e.target.value)}
                    />
                    <SmallInput
                      placeholder={t('recipe.form.tipsOptional')}
                      value={step.tips}
                      onChange={(e) => updateStep(step.id, 'tips', e.target.value)}
                      style={{ flex: 1 }}
                    />
                  </StepMeta>
                </StepContent>
                <IconButton onClick={() => removeStep(step.id)} style={{ marginTop: 8 }}>
                  <span className="material-symbols-outlined">delete</span>
                </IconButton>
              </StepRow>
            ))}
            <AddButton onClick={addStep}>
              <span className="material-symbols-outlined">add</span>
              {t('recipe.form.addStep')}
            </AddButton>
          </Section>
        </Content>

        <Footer>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button $primary onClick={handleSubmit} disabled={!isValid}>
            {recipe ? t('recipe.form.saveChanges') : t('recipe.form.createRecipe')}
          </Button>
        </Footer>
      </Modal>
    </Overlay>
  );
};
