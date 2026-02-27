import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { useShoppingListStore } from '../../stores/shoppingListStore';
import { copyToClipboard } from '../../utils/shareUtils';
import type { ShoppingList } from '../../types/ShoppingList';

const colors = {
  primary: '#2C3E50',
  primaryDark: '#1a252f',
  backgroundLight: '#F0F4F8',
  textMain: '#333333',
  textMuted: '#64748b',
  green500: '#22c55e',
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
  padding: 24px;
`;

const Description = styled.p`
  font-size: 14px;
  color: ${colors.textMuted};
  margin: 0 0 20px;
  line-height: 1.5;
`;

const LinkSection = styled.div`
  margin-bottom: 20px;
`;

const LinkLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${colors.textMuted};
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const LinkRow = styled.div`
  display: flex;
  gap: 8px;
`;

const LinkInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-size: 14px;
  color: ${colors.textMain};
  background: ${colors.backgroundLight};
  min-width: 0;

  &:focus {
    outline: none;
    border-color: ${colors.primary};
  }
`;

const CopyButton = styled.button<{ $copied: boolean }>`
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  background: ${(props) => (props.$copied ? colors.green500 : colors.primary)};
  color: white;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.2s;
  white-space: nowrap;
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;

  &:hover {
    background: ${(props) => (props.$copied ? colors.green500 : colors.primaryDark)};
  }

  .material-symbols-outlined {
    font-size: 18px;
  }
`;

const ActionsRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const ActionButton = styled.button<{ $variant?: 'default' | 'danger' }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;

  ${(props) =>
    props.$variant === 'danger'
      ? `
    background: #fee2e2;
    color: #dc2626;
    border: none;
    &:hover { background: #fecaca; }
  `
      : `
    background: white;
    color: ${colors.textMain};
    border: 1px solid rgba(44, 62, 80, 0.2);
    &:hover { background: #f8f9fa; border-color: ${colors.primary}; }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .material-symbols-outlined {
    font-size: 16px;
  }
`;

const EnableSection = styled.div`
  text-align: center;
  padding: 20px 0;
`;

const EnableButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  background: ${colors.primary};
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;

  &:hover {
    background: ${colors.primaryDark};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .material-symbols-outlined {
    font-size: 20px;
  }
`;

const MemberCount = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  background: ${colors.backgroundLight};
  border-radius: 10px;
  margin-bottom: 20px;
  font-size: 14px;
  color: ${colors.textMain};

  .material-symbols-outlined {
    font-size: 20px;
    color: ${colors.primary};
  }

  strong {
    font-weight: 700;
  }
`;

const ErrorMessage = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 16px;
`;

interface ShareListModalProps {
  list: ShoppingList;
  onClose: () => void;
}

export const ShareListModal: React.FC<ShareListModalProps> = ({ list, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateInviteCode = useShoppingListStore((s) => s.generateInviteCode);
  const disableInviteLink = useShoppingListStore((s) => s.disableInviteLink);

  const inviteUrl = list.inviteCode && list.inviteEnabled
    ? `${window.location.origin}/shopping/join/${list.inviteCode}`
    : '';

  const memberCount = list.memberIds.length;

  const handleGenerateLink = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    try {
      await generateInviteCode(list.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate invite link');
    } finally {
      setIsProcessing(false);
    }
  }, [generateInviteCode, list.id]);

  const handleRegenerateLink = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    try {
      await generateInviteCode(list.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate invite link');
    } finally {
      setIsProcessing(false);
    }
  }, [generateInviteCode, list.id]);

  const handleDisableLink = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    try {
      await disableInviteLink(list.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable invite link');
    } finally {
      setIsProcessing(false);
    }
  }, [disableInviteLink, list.id]);

  const handleCopy = useCallback(async () => {
    if (!inviteUrl) return;
    const success = await copyToClipboard(inviteUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [inviteUrl]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return (
    <Overlay onClick={handleOverlayClick}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>
            <span className="material-symbols-outlined">share</span>
            Share List
          </Title>
          <CloseButton onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </CloseButton>
        </Header>

        <Content>
          {error && <ErrorMessage>{error}</ErrorMessage>}

          <MemberCount>
            <span className="material-symbols-outlined">group</span>
            <strong>{memberCount}</strong> member{memberCount !== 1 ? 's' : ''} on this list
          </MemberCount>

          <Description>
            Share an invite link so others can join and collaborate on "{list.name}".
            Anyone with the link who has an account can join as an editor.
          </Description>

          {list.inviteEnabled && inviteUrl ? (
            <>
              <LinkSection>
                <LinkLabel>Invite Link</LinkLabel>
                <LinkRow>
                  <LinkInput
                    type="text"
                    value={inviteUrl}
                    readOnly
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <CopyButton $copied={copied} onClick={handleCopy}>
                    <span className="material-symbols-outlined">
                      {copied ? 'check' : 'content_copy'}
                    </span>
                    {copied ? 'Copied!' : 'Copy'}
                  </CopyButton>
                </LinkRow>
              </LinkSection>

              <ActionsRow>
                <ActionButton onClick={handleRegenerateLink} disabled={isProcessing}>
                  <span className="material-symbols-outlined">refresh</span>
                  New Link
                </ActionButton>
                <ActionButton $variant="danger" onClick={handleDisableLink} disabled={isProcessing}>
                  <span className="material-symbols-outlined">link_off</span>
                  Disable Link
                </ActionButton>
              </ActionsRow>
            </>
          ) : (
            <EnableSection>
              <EnableButton onClick={handleGenerateLink} disabled={isProcessing}>
                <span className="material-symbols-outlined">link</span>
                {isProcessing ? 'Generating...' : 'Create Invite Link'}
              </EnableButton>
            </EnableSection>
          )}
        </Content>
      </Modal>
    </Overlay>
  );
};
