import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import type { Recipe } from '../../types/Recipe';
import { parseKeepHtml, isLikelyRecipe, type KeepNote } from '../../utils/keepHtmlParser';

const colors = {
  primary: '#2C3E50',
  primaryDark: '#1a252f',
  backgroundLight: '#F0F4F8',
  surface: '#ffffff',
  textMain: '#333333',
  textMuted: '#64748b',
  green500: '#22c55e',
  red500: '#ef4444',
};

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
  max-width: 800px;
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
  color: ${colors.textMain};
  display: flex;
  align-items: center;
  gap: 8px;

  .material-symbols-outlined {
    color: ${colors.primary};
  }
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

const StepIndicator = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

const Step = styled.div<{ $active: boolean; $completed: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  background: ${(props) =>
    props.$active ? colors.primary : props.$completed ? colors.green500 : '#e0e0e0'};
  color: ${(props) => (props.$active || props.$completed ? 'white' : colors.textMuted)};
  transition: all 0.2s;

  .material-symbols-outlined {
    font-size: 16px;
  }
`;

const Section = styled.div`
  margin-bottom: 24px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: ${colors.textMain};
  margin-bottom: 8px;
`;

const HelpText = styled.p`
  font-size: 13px;
  color: ${colors.textMuted};
  margin: 0 0 12px 0;
`;

const DropZone = styled.div<{ $isDragging: boolean }>`
  border: 2px dashed ${(props) => (props.$isDragging ? colors.primary : '#e0e0e0')};
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  background: ${(props) => (props.$isDragging ? 'rgba(44, 62, 80, 0.05)' : colors.backgroundLight)};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${colors.primary};
    background: rgba(44, 62, 80, 0.05);
  }

  .material-symbols-outlined {
    font-size: 48px;
    color: ${colors.textMuted};
    margin-bottom: 12px;
  }

  p {
    margin: 0;
    color: ${colors.textMuted};
    font-size: 14px;
  }
`;

const HiddenInput = styled.input`
  display: none;
`;

const NoteList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
`;

const NoteItem = styled.label<{ $isRecipe: boolean }>`
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: ${(props) => (props.$isRecipe ? 'rgba(34, 197, 94, 0.1)' : colors.backgroundLight)};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${(props) =>
      props.$isRecipe ? 'rgba(34, 197, 94, 0.15)' : 'rgba(44, 62, 80, 0.1)'};
  }
`;

const NoteCheckbox = styled.input`
  width: 18px;
  height: 18px;
  margin-top: 2px;
  cursor: pointer;
`;

const NoteContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const NoteTitle = styled.div`
  font-weight: 600;
  color: ${colors.textMain};
  margin-bottom: 4px;
`;

const NotePreview = styled.div`
  font-size: 13px;
  color: ${colors.textMuted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RecipeBadge = styled.span`
  font-size: 11px;
  background: ${colors.green500};
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: 8px;
`;

const SelectionActions = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
`;

const SmallButton = styled.button`
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  background: white;
  color: ${colors.textMain};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${colors.backgroundLight};
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 200px;
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  line-height: 1.5;

  &:focus {
    outline: none;
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px rgba(44, 62, 80, 0.1);
  }

  &::placeholder {
    color: ${colors.textMuted};
  }
`;

const PromptBox = styled.div`
  background: ${colors.backgroundLight};
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 16px;
  font-size: 13px;
  font-family: 'Monaco', 'Menlo', monospace;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
`;

const Button = styled.button<{ $primary?: boolean; $success?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;

  ${(props) =>
    props.$primary
      ? `
    background: ${colors.primary};
    color: white;
    &:hover {
      background: ${colors.primaryDark};
    }
  `
      : props.$success
        ? `
    background: ${colors.green500};
    color: white;
    &:hover {
      background: #16a34a;
    }
  `
        : `
    background: #f0f0f0;
    color: ${colors.textMain};
    &:hover {
      background: #e0e0e0;
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .material-symbols-outlined {
    font-size: 18px;
  }
`;

const Footer = styled.div`
  padding: 16px 24px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ErrorMessage = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: ${colors.red500};
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  margin-top: 12px;
`;

const SuccessMessage = styled.div`
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #16a34a;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;

  .material-symbols-outlined {
    font-size: 18px;
  }
`;

const PreviewCard = styled.div`
  background: ${colors.backgroundLight};
  border-radius: 12px;
  padding: 20px;
  margin-top: 16px;
`;

const PreviewTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 700;
  color: ${colors.textMain};
`;

const PreviewMeta = styled.div`
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: ${colors.textMuted};
  margin-bottom: 12px;
  flex-wrap: wrap;
`;

const PreviewDescription = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${colors.textMain};
  line-height: 1.5;
`;

const CurrentNoteHeader = styled.div`
  background: ${colors.backgroundLight};
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
`;

const CurrentNoteTitle = styled.div`
  font-weight: 600;
  color: ${colors.textMain};
  margin-bottom: 4px;
`;

const ProgressIndicator = styled.div`
  font-size: 13px;
  color: ${colors.textMuted};
`;

// Helper function to escape text for safe JSON string inclusion
function escapeForJSON(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, (char) =>
      '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0')
    );
}

// Helper function to sanitize JSON output from AI models
function sanitizeModelJSON(text: string): string {
  return text
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2028\u2029]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

const CONVERSION_PROMPT = `You are a recipe data converter. Convert the provided recipe into the exact JSON format specified below.

## Output Format

\`\`\`json
{
  "title": "Recipe Name",
  "description": "Brief 1-2 sentence description",
  "aboutDish": "Optional longer description about the dish's origin, history, or what makes it special",
  "image": "",
  "prepTime": 15,
  "cookTime": 30,
  "difficulty": "easy|medium|hard",
  "defaultServings": 4,
  "category": "Main Dishes|Appetizers|Desserts|Soups|Salads|Breakfast|Beverages|Side Dishes|Snacks",
  "tags": ["tag1", "tag2"],
  "author": "Optional author name",
  "rating": 4.5,
  "nutrition": {
    "calories": 350,
    "protein": 25,
    "carbs": 30,
    "fat": 15
  },
  "chefTip": "Optional professional tip for best results",
  "language": "en|he",
  "ingredients": [
    {
      "id": "ing-1",
      "name": "ingredient name",
      "quantity": 2,
      "unit": "cups|tbsp|tsp|g|kg|ml|l|oz|lb|pieces|cloves|whole",
      "category": "produce|dairy|meat|pantry|frozen|bakery|spices|other",
      "notes": "optional notes like 'diced' or 'room temperature'"
    }
  ],
  "steps": [
    {
      "id": "step-1",
      "order": 1,
      "description": "Step instruction text",
      "timer": 300,
      "tips": "Optional tip for this step"
    }
  ]
}
\`\`\`

## Category Mapping for Ingredients
- **produce**: fruits, vegetables, fresh herbs, garlic, onions, potatoes
- **dairy**: milk, cheese, butter, eggs, cream, yogurt
- **meat**: beef, chicken, pork, fish, seafood, lamb
- **bakery**: bread, tortillas, pita, buns, pastry
- **frozen**: frozen vegetables, ice cream, frozen fruits
- **pantry**: pasta, rice, flour, sugar, canned goods, oils, vinegar, sauces
- **spices**: salt, pepper, cumin, paprika, dried herbs, spice blends
- **other**: anything that doesn't fit above

## Rules
1. Generate unique IDs for ingredients (ing-1, ing-2...) and steps (step-1, step-2...)
2. Timer is in SECONDS (5 minutes = 300 seconds). Only add timer if step involves waiting/cooking time
3. Times (prepTime, cookTime) are in MINUTES
4. Quantity must be a number (use 0.5 for "half", 0.25 for "quarter")
5. Keep step descriptions clear and actionable
6. Use "en" for English recipes, "he" for Hebrew recipes
7. Estimate nutrition if not provided (per serving)
8. Tags should be lowercase, no spaces (use hyphens if needed)
9. Difficulty: easy (under 30 min, simple techniques), medium (30-60 min or moderate skill), hard (60+ min or advanced techniques)

## Recipe to Convert

Note: The recipe text below has special characters pre-escaped for JSON (e.g., quotes as \\", backslashes as \\\\, newlines as \\n). Use these escaped values directly in your JSON string fields.

`;

interface KeepImportModalProps {
  onImport: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

type ImportStep = 'files' | 'select' | 'convert' | 'import';

export const KeepImportModal: React.FC<KeepImportModalProps> = ({ onImport, onClose }) => {
  const [step, setStep] = useState<ImportStep>('files');
  const [notes, setNotes] = useState<KeepNote[]>([]);
  const [selectedNotes, setSelectedNotes] = useState<Set<number>>(new Set());
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [jsonResult, setJsonResult] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [parsedRecipe, setParsedRecipe] = useState<Omit<
    Recipe,
    'id' | 'createdAt' | 'updatedAt'
  > | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedNotesArray = Array.from(selectedNotes)
    .sort((a, b) => a - b)
    .map((i) => notes[i]);
  const currentNote = selectedNotesArray[currentNoteIndex];

  const fullPrompt = currentNote
    ? CONVERSION_PROMPT +
      `Title: ${escapeForJSON(currentNote.title)}\n\nContent:\n${escapeForJSON(currentNote.content)}` +
      '\n\n---\n\nOutput ONLY the JSON object, no additional text or markdown code blocks.'
    : '';

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const parsedNotes: KeepNote[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.name.endsWith('.html')) {
        const content = await file.text();
        const note = parseKeepHtml(content, file.name);
        if (note) {
          parsedNotes.push(note);
        }
      }
    }

    if (parsedNotes.length > 0) {
      setNotes(parsedNotes);
      // Auto-select notes that look like recipes
      const recipeIndices = new Set<number>();
      parsedNotes.forEach((note, index) => {
        if (isLikelyRecipe(note)) {
          recipeIndices.add(index);
        }
      });
      setSelectedNotes(recipeIndices);
      setStep('select');
    } else {
      setError('No valid Google Keep notes found in the selected files.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const toggleNote = (index: number) => {
    const newSelected = new Set(selectedNotes);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedNotes(newSelected);
  };

  const selectAll = () => {
    setSelectedNotes(new Set(notes.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelectedNotes(new Set());
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(fullPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = fullPrompt;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleParseJSON = () => {
    setError(null);
    try {
      let cleanJson = jsonResult.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.slice(7);
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.slice(3);
      }
      if (cleanJson.endsWith('```')) {
        cleanJson = cleanJson.slice(0, -3);
      }
      cleanJson = cleanJson.trim();
      cleanJson = sanitizeModelJSON(cleanJson);

      const parsed = JSON.parse(cleanJson);

      if (!parsed.title || !parsed.ingredients || !parsed.steps) {
        throw new Error('Missing required fields: title, ingredients, or steps');
      }

      if (!Array.isArray(parsed.ingredients)) {
        throw new Error('Ingredients must be an array');
      }
      if (!Array.isArray(parsed.steps)) {
        throw new Error('Steps must be an array');
      }

      const recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'> = {
        title: parsed.title,
        description: parsed.description || '',
        aboutDish: parsed.aboutDish,
        image: parsed.image,
        prepTime: parsed.prepTime || 15,
        cookTime: parsed.cookTime || 30,
        difficulty: parsed.difficulty || 'medium',
        defaultServings: parsed.defaultServings || 4,
        ingredients: parsed.ingredients,
        steps: parsed.steps,
        tags: parsed.tags || [],
        category: parsed.category || 'Main Dishes',
        author: parsed.author,
        rating: parsed.rating,
        reviewCount: parsed.reviewCount,
        nutrition: parsed.nutrition,
        chefTip: parsed.chefTip,
        language: parsed.language || 'en',
      };

      setParsedRecipe(recipe);
      setStep('import');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON format');
      setParsedRecipe(null);
    }
  };

  const handleImportRecipe = () => {
    if (parsedRecipe) {
      onImport(parsedRecipe);
      setImportedCount((c) => c + 1);

      // Check if there are more notes to process
      if (currentNoteIndex < selectedNotesArray.length - 1) {
        setCurrentNoteIndex((i) => i + 1);
        setJsonResult('');
        setParsedRecipe(null);
        setError(null);
        setStep('convert');
      } else {
        // All done
        onClose();
      }
    }
  };

  const handleSkipNote = () => {
    if (currentNoteIndex < selectedNotesArray.length - 1) {
      setCurrentNoteIndex((i) => i + 1);
      setJsonResult('');
      setParsedRecipe(null);
      setError(null);
    } else {
      onClose();
    }
  };

  const getStepNumber = (s: ImportStep): number => {
    switch (s) {
      case 'files':
        return 1;
      case 'select':
        return 2;
      case 'convert':
        return 3;
      case 'import':
        return 4;
    }
  };

  const isStepCompleted = (s: ImportStep): boolean => {
    return getStepNumber(s) < getStepNumber(step);
  };

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>
            <span className="material-symbols-outlined">upload_file</span>
            Import from Google Keep
          </Title>
          <CloseButton onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </CloseButton>
        </Header>

        <Content>
          <StepIndicator>
            <Step $active={step === 'files'} $completed={isStepCompleted('files')}>
              {isStepCompleted('files') ? (
                <span className="material-symbols-outlined">check</span>
              ) : (
                '1 '
              )}
              Select Files
            </Step>
            <Step $active={step === 'select'} $completed={isStepCompleted('select')}>
              {isStepCompleted('select') ? (
                <span className="material-symbols-outlined">check</span>
              ) : (
                '2 '
              )}
              Choose Notes
            </Step>
            <Step $active={step === 'convert'} $completed={isStepCompleted('convert')}>
              {isStepCompleted('convert') ? (
                <span className="material-symbols-outlined">check</span>
              ) : (
                '3 '
              )}
              Convert
            </Step>
            <Step $active={step === 'import'} $completed={false}>
              {'4 '}
              Import
            </Step>
          </StepIndicator>

          {step === 'files' && (
            <Section>
              <Label>Upload Google Keep exports</Label>
              <HelpText>
                Export your notes from Google Takeout and select the HTML files from the Keep
                folder.
              </HelpText>
              <DropZone
                $isDragging={isDragging}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="material-symbols-outlined">cloud_upload</span>
                <p>
                  <strong>Drop HTML files here</strong> or click to browse
                </p>
                <p style={{ fontSize: '12px', marginTop: '8px' }}>
                  Select multiple .html files from your Google Takeout export
                </p>
              </DropZone>
              <HiddenInput
                ref={fileInputRef}
                type="file"
                accept=".html"
                multiple
                onChange={(e) => handleFileSelect(e.target.files)}
              />
              {error && <ErrorMessage>{error}</ErrorMessage>}
              <ButtonRow>
                <Button onClick={onClose}>Cancel</Button>
              </ButtonRow>
            </Section>
          )}

          {step === 'select' && (
            <Section>
              <Label>Select notes to import ({notes.length} notes found)</Label>
              <HelpText>
                Notes that appear to be recipes are highlighted and pre-selected. Uncheck any you
                don't want to import.
              </HelpText>
              <SelectionActions>
                <SmallButton onClick={selectAll}>Select All</SmallButton>
                <SmallButton onClick={deselectAll}>Deselect All</SmallButton>
              </SelectionActions>
              <NoteList>
                {notes.map((note, index) => {
                  const isRecipe = isLikelyRecipe(note);
                  return (
                    <NoteItem key={index} $isRecipe={isRecipe}>
                      <NoteCheckbox
                        type="checkbox"
                        checked={selectedNotes.has(index)}
                        onChange={() => toggleNote(index)}
                      />
                      <NoteContent>
                        <NoteTitle>
                          {note.title || '(Untitled)'}
                          {isRecipe && <RecipeBadge>Likely recipe</RecipeBadge>}
                        </NoteTitle>
                        <NotePreview>
                          {note.content.substring(0, 100)}
                          {note.content.length > 100 && '...'}
                        </NotePreview>
                      </NoteContent>
                    </NoteItem>
                  );
                })}
              </NoteList>
              <ButtonRow>
                <Button onClick={() => setStep('files')}>
                  <span className="material-symbols-outlined">arrow_back</span>
                  Back
                </Button>
                <Button
                  $primary
                  onClick={() => {
                    setCurrentNoteIndex(0);
                    setStep('convert');
                  }}
                  disabled={selectedNotes.size === 0}
                >
                  Convert {selectedNotes.size} Note{selectedNotes.size !== 1 ? 's' : ''}
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Button>
              </ButtonRow>
            </Section>
          )}

          {step === 'convert' && currentNote && (
            <Section>
              <CurrentNoteHeader>
                <CurrentNoteTitle>{currentNote.title || '(Untitled)'}</CurrentNoteTitle>
                <ProgressIndicator>
                  Note {currentNoteIndex + 1} of {selectedNotesArray.length}
                  {importedCount > 0 && ` (${importedCount} imported)`}
                </ProgressIndicator>
              </CurrentNoteHeader>

              <Label>Copy this prompt to Claude or ChatGPT</Label>
              <HelpText>
                Copy the prompt below and paste it into your preferred AI assistant. Then copy the
                JSON response back here.
              </HelpText>
              <PromptBox>{fullPrompt}</PromptBox>
              <ButtonRow>
                <Button $success onClick={handleCopyPrompt}>
                  <span className="material-symbols-outlined">
                    {copied ? 'check' : 'content_copy'}
                  </span>
                  {copied ? 'Copied!' : 'Copy Prompt'}
                </Button>
              </ButtonRow>

              <div style={{ marginTop: '24px' }}>
                <Label>Paste the JSON result</Label>
                <TextArea
                  value={jsonResult}
                  onChange={(e) => {
                    setJsonResult(e.target.value);
                    setError(null);
                  }}
                  placeholder="Paste the JSON here..."
                />
              </div>

              {error && <ErrorMessage>{error}</ErrorMessage>}

              <ButtonRow>
                <Button onClick={() => setStep('select')}>
                  <span className="material-symbols-outlined">arrow_back</span>
                  Back
                </Button>
                <Button onClick={handleSkipNote}>Skip This Note</Button>
                <Button $primary onClick={handleParseJSON} disabled={!jsonResult.trim()}>
                  <span className="material-symbols-outlined">check_circle</span>
                  Validate JSON
                </Button>
              </ButtonRow>
            </Section>
          )}

          {step === 'import' && parsedRecipe && (
            <Section>
              <CurrentNoteHeader>
                <CurrentNoteTitle>Ready to Import</CurrentNoteTitle>
                <ProgressIndicator>
                  Note {currentNoteIndex + 1} of {selectedNotesArray.length}
                  {importedCount > 0 && ` (${importedCount} imported)`}
                </ProgressIndicator>
              </CurrentNoteHeader>

              <SuccessMessage>
                <span className="material-symbols-outlined">check_circle</span>
                Recipe parsed successfully!
              </SuccessMessage>
              <PreviewCard>
                <PreviewTitle>{parsedRecipe.title}</PreviewTitle>
                <PreviewMeta>
                  <span>{parsedRecipe.prepTime + parsedRecipe.cookTime} min</span>
                  <span>{parsedRecipe.difficulty}</span>
                  <span>{parsedRecipe.defaultServings} servings</span>
                  <span>{parsedRecipe.ingredients.length} ingredients</span>
                  <span>{parsedRecipe.steps.length} steps</span>
                </PreviewMeta>
                <PreviewDescription>{parsedRecipe.description}</PreviewDescription>
              </PreviewCard>

              <ButtonRow>
                <Button
                  onClick={() => {
                    setStep('convert');
                    setParsedRecipe(null);
                  }}
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  Back
                </Button>
                <Button $success onClick={handleImportRecipe}>
                  <span className="material-symbols-outlined">add</span>
                  {currentNoteIndex < selectedNotesArray.length - 1
                    ? 'Import & Continue'
                    : 'Import Recipe'}
                </Button>
              </ButtonRow>
            </Section>
          )}
        </Content>

        <Footer>
          <Button onClick={onClose}>Cancel</Button>
          {importedCount > 0 && (
            <span style={{ color: colors.textMuted, fontSize: '13px' }}>
              {importedCount} recipe{importedCount !== 1 ? 's' : ''} imported
            </span>
          )}
        </Footer>
      </Modal>
    </Overlay>
  );
};
