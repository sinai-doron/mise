import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { imageToBase64 } from '../../utils/recipeStorage';
import { extractImageFromUrl, isYouTubeUrl } from '../../utils/imageExtractor';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: #333;
`;

const TabsContainer = styled.div`
  display: flex;
  gap: 4px;
  background: #f0f0f0;
  border-radius: 8px;
  padding: 4px;
`;

const Tab = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  background: ${(props) => (props.$active ? 'white' : 'transparent')};
  color: ${(props) => (props.$active ? '#333' : '#666')};
  box-shadow: ${(props) =>
    props.$active ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'};
`;

const UrlInput = styled.input`
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #f59e0b;
  }
`;

const DropZone = styled.div<{ $isDragging: boolean; $hasImage: boolean }>`
  border: 2px dashed ${(props) => (props.$isDragging ? '#f59e0b' : '#e0e0e0')};
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.15s;
  background: ${(props) =>
    props.$isDragging
      ? 'rgba(245, 158, 11, 0.05)'
      : props.$hasImage
      ? '#f9f9f9'
      : 'white'};

  &:hover {
    border-color: #f59e0b;
    background: rgba(245, 158, 11, 0.05);
  }
`;

const DropZoneIcon = styled.div`
  margin-bottom: 12px;

  .material-symbols-outlined {
    font-size: 48px;
    color: #ccc;
  }
`;

const DropZoneText = styled.p`
  margin: 0;
  font-size: 14px;
  color: #666;
`;

const DropZoneHint = styled.p`
  margin: 8px 0 0 0;
  font-size: 12px;
  color: #999;
`;

const Preview = styled.div`
  position: relative;
  margin-top: 12px;
`;

const PreviewImage = styled.img`
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  border-radius: 8px;
`;

const RemoveButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(0, 0, 0, 0.8);
  }

  .material-symbols-outlined {
    font-size: 18px;
  }
`;

const ErrorMessage = styled.p`
  margin: 8px 0 0 0;
  font-size: 13px;
  color: #ef4444;
`;

const ExtractContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ExtractInputRow = styled.div`
  display: flex;
  gap: 8px;
`;

const ExtractInput = styled.input`
  flex: 1;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #f59e0b;
  }
`;

const ExtractButton = styled.button`
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  background: #2C3E50;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover:not(:disabled) {
    background: #1a252f;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .material-symbols-outlined {
    font-size: 18px;
  }
`;

const ExtractHint = styled.p`
  margin: 0;
  font-size: 12px;
  color: #666;
`;

const LoadingSpinner = styled.span`
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  display: inline-block;
  animation: spin 1s linear infinite;
`;

interface ImageUploaderProps {
  value: string;
  onChange: (value: string) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ value, onChange }) => {
  const [mode, setMode] = useState<'url' | 'upload' | 'extract'>(value.startsWith('data:') ? 'upload' : 'url');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractUrl, setExtractUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    onChange(e.target.value);
  };

  const handleFileSelect = async (file: File) => {
    setError(null);

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be smaller than 10MB');
      return;
    }

    try {
      const base64 = await imageToBase64(file);
      onChange(base64);
    } catch {
      setError('Failed to process image');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemove = () => {
    onChange('');
    setError(null);
  };

  const handleExtract = async () => {
    if (!extractUrl.trim() || isExtracting) return;

    setIsExtracting(true);
    setError(null);

    try {
      const result = await extractImageFromUrl(extractUrl);
      if (result.success && result.imageUrl) {
        onChange(result.imageUrl);
        setExtractUrl('');
      } else {
        setError(result.error || 'Failed to extract image');
      }
    } catch {
      setError('Failed to extract image from URL');
    } finally {
      setIsExtracting(false);
    }
  };

  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      // Only handle paste in upload mode
      if (mode !== 'upload') return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            await handleFileSelect(file);
          }
          return;
        }
      }
    },
    [mode]
  );

  // Listen for paste events when in upload mode
  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  return (
    <Container>
      <Label>Recipe Image</Label>

      <TabsContainer>
        <Tab $active={mode === 'url'} onClick={() => setMode('url')}>
          URL
        </Tab>
        <Tab $active={mode === 'upload'} onClick={() => setMode('upload')}>
          Upload
        </Tab>
        <Tab $active={mode === 'extract'} onClick={() => setMode('extract')}>
          Extract
        </Tab>
      </TabsContainer>

      {mode === 'url' && (
        <UrlInput
          type="url"
          placeholder="https://example.com/image.jpg"
          value={value.startsWith('data:') ? '' : value}
          onChange={handleUrlChange}
        />
      )}

      {mode === 'upload' && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
          <DropZone
            $isDragging={isDragging}
            $hasImage={!!value}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <DropZoneIcon>
              <span className="material-symbols-outlined">cloud_upload</span>
            </DropZoneIcon>
            <DropZoneText>
              Drag and drop, paste from clipboard, or click to browse
            </DropZoneText>
            <DropZoneHint>Images are automatically compressed • Ctrl+V to paste</DropZoneHint>
          </DropZone>
        </>
      )}

      {mode === 'extract' && (
        <ExtractContainer>
          <ExtractInputRow>
            <ExtractInput
              type="url"
              placeholder="Paste YouTube or webpage URL..."
              value={extractUrl}
              onChange={(e) => {
                setExtractUrl(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleExtract();
                }
              }}
            />
            <ExtractButton onClick={handleExtract} disabled={!extractUrl.trim() || isExtracting}>
              {isExtracting ? (
                <>
                  <LoadingSpinner className="material-symbols-outlined">progress_activity</LoadingSpinner>
                  Extracting...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">image_search</span>
                  Extract
                </>
              )}
            </ExtractButton>
          </ExtractInputRow>
          <ExtractHint>
            {isYouTubeUrl(extractUrl)
              ? 'YouTube video detected - will extract thumbnail'
              : 'Paste a YouTube video URL or webpage URL to extract the main image'}
          </ExtractHint>
        </ExtractContainer>
      )}

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {value && (
        <Preview>
          <PreviewImage src={value} alt="Recipe preview" />
          <RemoveButton onClick={handleRemove} title="Remove image">
            <span className="material-symbols-outlined">close</span>
          </RemoveButton>
        </Preview>
      )}
    </Container>
  );
};
