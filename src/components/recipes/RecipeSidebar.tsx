import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

// Color palette
const colors = {
  primary: '#2C3E50',
  primaryDark: '#1a252f',
  backgroundLight: '#F0F4F8',
  surface: '#ffffff',
  textMain: '#333333',
  textMuted: '#64748b',
};

const Container = styled.div`
  padding: 20px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(44, 62, 80, 0.15);
  border-radius: 10px;
  font-size: 14px;
  margin-bottom: 24px;
  background: ${colors.backgroundLight};
  transition: all 0.15s;

  &:focus {
    outline: none;
    border-color: ${colors.primary};
    background: ${colors.surface};
    box-shadow: 0 0 0 3px rgba(44, 62, 80, 0.1);
  }

  &::placeholder {
    color: ${colors.textMuted};
  }
`;

const Section = styled.div`
  margin-bottom: 28px;
`;

const SectionTitle = styled.h3`
  font-size: 11px;
  font-weight: 700;
  color: ${colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 12px 4px;
`;

const FilterList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const FilterItem = styled.li<{ $active: boolean }>`
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  color: ${(props) => (props.$active ? colors.primary : colors.textMain)};
  background: ${(props) => (props.$active ? 'rgba(44, 62, 80, 0.08)' : 'transparent')};
  font-weight: ${(props) => (props.$active ? '600' : '500')};
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;

  &:hover {
    background: ${(props) => (props.$active ? 'rgba(44, 62, 80, 0.12)' : 'rgba(44, 62, 80, 0.05)')};
  }

  .material-symbols-outlined {
    font-size: 18px;
    color: ${(props) => (props.$active ? colors.primary : colors.textMuted)};
  }
`;

const TagChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  margin: 4px;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid ${(props) => (props.$active ? colors.primary : 'rgba(44, 62, 80, 0.15)')};
  background: ${(props) => (props.$active ? 'rgba(44, 62, 80, 0.08)' : 'white')};
  color: ${(props) => (props.$active ? colors.primary : colors.textMuted)};

  &:hover {
    border-color: ${colors.primary};
    background: rgba(44, 62, 80, 0.05);
    color: ${colors.primary};
  }
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin: -4px;
`;

const ShowMoreButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  margin: 8px 4px 4px;
  border: none;
  background: transparent;
  color: ${colors.primary};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s;

  &:hover {
    background: rgba(44, 62, 80, 0.05);
  }

  .material-symbols-outlined {
    font-size: 16px;
  }
`;

const RecipeCount = styled.div`
  font-size: 13px;
  color: ${colors.textMuted};
  padding: 16px;
  border-top: 1px solid rgba(44, 62, 80, 0.1);
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ClearButton = styled.button`
  background: none;
  border: none;
  color: ${colors.primary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;

  &:hover {
    text-decoration: underline;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const LanguageChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  margin: 4px;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid ${(props) => (props.$active ? colors.primary : 'rgba(44, 62, 80, 0.15)')};
  background: ${(props) => (props.$active ? 'rgba(44, 62, 80, 0.08)' : 'white')};
  color: ${(props) => (props.$active ? colors.primary : colors.textMain)};

  &:hover {
    border-color: ${colors.primary};
    background: rgba(44, 62, 80, 0.05);
    color: ${colors.primary};
  }
`;

const LanguageFlag = styled.span`
  font-size: 16px;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  color: ${colors.textMain};
  font-weight: 500;
  transition: all 0.15s;

  &:hover {
    background: rgba(44, 62, 80, 0.05);
  }

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: ${colors.primary};
    cursor: pointer;
  }

  .material-symbols-outlined {
    font-size: 18px;
    color: ${colors.textMuted};
  }
`;

const LANGUAGE_OPTIONS: { code: string; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'he', label: 'עברית', flag: '🇮🇱' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'fa', label: 'فارسی', flag: '🇮🇷' },
  { code: 'ur', label: 'اردو', flag: '🇵🇰' },
];

interface RecipeSidebarProps {
  categories: string[];
  tags: string[];
  languages: string[];
  selectedCategory: string | null;
  selectedTag: string | null;
  selectedLanguage: string | null;
  searchQuery: string;
  hideBuiltIn: boolean;
  onSelectCategory: (category: string | null) => void;
  onSelectTag: (tag: string | null) => void;
  onSelectLanguage: (language: string | null) => void;
  onSearchChange: (query: string) => void;
  onToggleHideBuiltIn: () => void;
  recipeCount: number;
}

export const RecipeSidebar: React.FC<RecipeSidebarProps> = ({
  categories,
  tags,
  languages,
  selectedCategory,
  selectedTag,
  selectedLanguage,
  searchQuery,
  hideBuiltIn,
  onSelectCategory,
  onSelectTag,
  onSelectLanguage,
  onSearchChange,
  onToggleHideBuiltIn,
  recipeCount,
}) => {
  const { t } = useTranslation();
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const hasFilters = selectedCategory || selectedTag || selectedLanguage || searchQuery || hideBuiltIn;

  const clearFilters = () => {
    onSelectCategory(null);
    onSelectTag(null);
    onSelectLanguage(null);
    onSearchChange('');
    if (hideBuiltIn) onToggleHideBuiltIn();
  };

  // Filter language options to only show languages that exist in recipes
  const availableLanguages = LANGUAGE_OPTIONS.filter((lang) =>
    languages.includes(lang.code)
  );

  return (
    <Container>
      <Section>
        <SectionHeader>
          <SectionTitle>{t('sidebar.categories')}</SectionTitle>
          {selectedCategory && (
            <ClearButton onClick={() => onSelectCategory(null)}>{t('common.clear')}</ClearButton>
          )}
        </SectionHeader>
        <FilterList>
          <FilterItem
            $active={!selectedCategory}
            onClick={() => onSelectCategory(null)}
          >
            <span className="material-symbols-outlined">apps</span>
            {t('sidebar.allRecipes')}
          </FilterItem>
          {categories.map((category) => (
            <FilterItem
              key={category}
              $active={selectedCategory === category}
              onClick={() => onSelectCategory(category)}
            >
              <span className="material-symbols-outlined">folder</span>
              {category}
            </FilterItem>
          ))}
        </FilterList>
      </Section>

      {tags.length > 0 && (
        <Section>
          <SectionHeader>
            <SectionTitle>{t('sidebar.tags')}</SectionTitle>
            {selectedTag && (
              <ClearButton onClick={() => onSelectTag(null)}>{t('common.clear')}</ClearButton>
            )}
          </SectionHeader>
          <TagsContainer>
            {(tagsExpanded ? tags : tags.slice(0, 6)).map((tag) => (
              <TagChip
                key={tag}
                $active={selectedTag === tag}
                onClick={() => onSelectTag(selectedTag === tag ? null : tag)}
              >
                #{tag}
              </TagChip>
            ))}
          </TagsContainer>
          {tags.length > 6 && (
            <ShowMoreButton onClick={() => setTagsExpanded(!tagsExpanded)}>
              <span className="material-symbols-outlined">
                {tagsExpanded ? 'expand_less' : 'expand_more'}
              </span>
              {tagsExpanded ? t('common.showLess', 'Show less') : `+${tags.length - 6} more`}
            </ShowMoreButton>
          )}
        </Section>
      )}

      {availableLanguages.length > 1 && (
        <Section>
          <SectionHeader>
            <SectionTitle>{t('sidebar.language')}</SectionTitle>
            {selectedLanguage && (
              <ClearButton onClick={() => onSelectLanguage(null)}>{t('common.clear')}</ClearButton>
            )}
          </SectionHeader>
          <TagsContainer>
            {availableLanguages.map((lang) => (
              <LanguageChip
                key={lang.code}
                $active={selectedLanguage === lang.code}
                onClick={() => onSelectLanguage(selectedLanguage === lang.code ? null : lang.code)}
              >
                <LanguageFlag>{lang.flag}</LanguageFlag>
                {lang.label}
              </LanguageChip>
            ))}
          </TagsContainer>
        </Section>
      )}

      <Section>
        <SectionTitle>{t('sidebar.viewOptions')}</SectionTitle>
        <CheckboxLabel>
          <input
            type="checkbox"
            checked={hideBuiltIn}
            onChange={onToggleHideBuiltIn}
          />
          <span className="material-symbols-outlined">visibility_off</span>
          {t('sidebar.hideBuiltIn')}
        </CheckboxLabel>
      </Section>

      <RecipeCount>
        <span>
          {recipeCount} {recipeCount === 1 ? t('common.recipe') : t('common.recipes')}
        </span>
        {hasFilters && (
          <ClearButton onClick={clearFilters}>
            {t('common.clearAll')}
          </ClearButton>
        )}
      </RecipeCount>
    </Container>
  );
};
