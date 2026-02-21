import React from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import type { Collection } from '../types/Recipe';

const colors = {
  primary: '#2C3E50',
  primaryDark: '#1a252f',
  backgroundLight: '#F0F4F8',
  surface: '#ffffff',
  textMain: '#333333',
  textMuted: '#64748b',
  amber500: '#f59e0b',
  amber100: '#fef3c7',
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
  max-width: 480px;
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
    color: ${colors.amber500};
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
  padding: 24px;
`;

const WarningBanner = styled.div`
  display: flex;
  gap: 12px;
  padding: 16px;
  background: ${colors.amber100};
  border-radius: 8px;
  margin-bottom: 20px;

  .material-symbols-outlined {
    color: ${colors.amber500};
    font-size: 24px;
    flex-shrink: 0;
  }
`;

const WarningText = styled.div`
  color: ${colors.textMain};
  line-height: 1.6;
`;

const CollectionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
`;

const CollectionItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: ${colors.backgroundLight};
  border-radius: 8px;
`;

const CollectionIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: ${colors.primary};
  color: white;
  border-radius: 8px;

  .material-symbols-outlined {
    font-size: 20px;
  }
`;

const CollectionName = styled.div`
  font-weight: 600;
  color: ${colors.textMain};
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'warning' }>`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;

  ${(props) => {
    switch (props.$variant) {
      case 'primary':
        return `
          background: ${colors.primary};
          color: white;
          &:hover { background: ${colors.primaryDark}; }
        `;
      case 'warning':
        return `
          background: ${colors.amber500};
          color: white;
          &:hover { background: #d97706; }
        `;
      default:
        return `
          background: ${colors.backgroundLight};
          color: ${colors.textMain};
          &:hover { background: #e0e0e0; }
        `;
    }
  }}

  .material-symbols-outlined {
    font-size: 18px;
  }
`;

interface PrivacyWarningDialogProps {
  recipeName: string;
  affectedCollections: Collection[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function PrivacyWarningDialog({
  recipeName,
  affectedCollections,
  onConfirm,
  onCancel,
}: PrivacyWarningDialogProps) {
  const { t } = useTranslation();

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <Overlay onClick={handleOverlayClick}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>
            <span className="material-symbols-outlined">warning</span>
            {t('share.privacyWarning', 'Privacy Warning')}
          </Title>
          <CloseButton onClick={onCancel}>
            <span className="material-symbols-outlined">close</span>
          </CloseButton>
        </Header>

        <Content>
          <WarningBanner>
            <span className="material-symbols-outlined">visibility_off</span>
            <WarningText>
              {t(
                'share.privacyWarningDesc',
                'Making "{recipeName}" private will hide it from the following public collections. Others viewing these collections will no longer see this recipe.'
              ).replace('{recipeName}', recipeName)}
            </WarningText>
          </WarningBanner>

          <CollectionList>
            {affectedCollections.map((collection) => (
              <CollectionItem key={collection.id}>
                <CollectionIcon>
                  <span className="material-symbols-outlined">collections_bookmark</span>
                </CollectionIcon>
                <CollectionName>{collection.name}</CollectionName>
              </CollectionItem>
            ))}
          </CollectionList>

          <ButtonRow>
            <Button onClick={onCancel}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button $variant="warning" onClick={onConfirm}>
              <span className="material-symbols-outlined">lock</span>
              {t('share.makePrivate', 'Make Private')}
            </Button>
          </ButtonRow>
        </Content>
      </Modal>
    </Overlay>
  );
}
