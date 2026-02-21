import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { SEO } from '../components/SEO';
import { useAuth } from '../firebase';
import { useUserProfileStore } from '../stores/userProfileStore';
import { UserAvatar } from '../components/UserAvatar';
import { UserMenu } from '../components/UserMenu';

// Color palette
const colors = {
  primary: '#2C3E50',
  primaryDark: '#1a252f',
  backgroundLight: '#F0F4F8',
  surface: '#ffffff',
  textMain: '#333333',
  textMuted: '#64748b',
  border: '#e0e0e0',
  success: '#22c55e',
  error: '#dc2626',
};

const PageContainer = styled.div`
  min-height: 100vh;
  background: ${colors.backgroundLight};
  display: flex;
  flex-direction: column;
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
`;

const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
  background: rgba(240, 244, 248, 0.9);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(44, 62, 80, 0.1);
`;

const HeaderContent = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${colors.textMuted};
  transition: all 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
    color: ${colors.textMain};
  }

  .material-symbols-outlined {
    font-size: 24px;
  }
`;

const PageTitle = styled.h1`
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 24px;
  font-weight: 600;
  color: ${colors.textMain};
  margin: 0;
`;

const MainContent = styled.main`
  flex: 1;
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
`;

const ProfileCard = styled.div`
  background: ${colors.surface};
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
`;

const AvatarSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32px;
`;

const AvatarWrapper = styled.div`
  position: relative;
  margin-bottom: 16px;
`;

const ChangeAvatarButton = styled.button`
  padding: 8px 16px;
  background: ${colors.surface};
  border: 1px solid ${colors.border};
  border-radius: 8px;
  font-size: 14px;
  color: ${colors.textMain};
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    background: ${colors.backgroundLight};
    border-color: ${colors.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .material-symbols-outlined {
    font-size: 18px;
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const FormSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 600;
  color: ${colors.textMain};
`;

const Input = styled.input`
  padding: 12px 16px;
  border: 1px solid ${colors.border};
  border-radius: 8px;
  font-size: 14px;
  color: ${colors.textMain};
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${colors.primary};
  }

  &:disabled {
    background: ${colors.backgroundLight};
    color: ${colors.textMuted};
    cursor: not-allowed;
  }
`;

const TextArea = styled.textarea`
  padding: 12px 16px;
  border: 1px solid ${colors.border};
  border-radius: 8px;
  font-size: 14px;
  color: ${colors.textMain};
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${colors.primary};
  }
`;

const HelpText = styled.span`
  font-size: 12px;
  color: ${colors.textMuted};
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  padding-top: 24px;
  border-top: 1px solid ${colors.border};
`;

const Button = styled.button<{ $primary?: boolean }>`
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  ${(props) =>
    props.$primary
      ? `
    background: ${colors.primary};
    color: white;
    border: none;

    &:hover:not(:disabled) {
      background: ${colors.primaryDark};
    }
  `
      : `
    background: ${colors.surface};
    color: ${colors.textMain};
    border: 1px solid ${colors.border};

    &:hover:not(:disabled) {
      background: ${colors.backgroundLight};
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StatusMessage = styled.div<{ $type: 'success' | 'error' }>`
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 8px;

  ${(props) =>
    props.$type === 'success'
      ? `
    background: #dcfce7;
    color: ${colors.success};
  `
      : `
    background: #fef2f2;
    color: ${colors.error};
  `}

  .material-symbols-outlined {
    font-size: 20px;
  }
`;

const LoadingOverlay = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: ${colors.textMuted};
`;

export function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    profile,
    isLoading,
    isSaving,
    error,
    initializeProfile,
    updateProfile,
    uploadAndSetAvatar,
    clearError,
  } = useUserProfileStore();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize profile on mount
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const init = async () => {
      cleanup = await initializeProfile();
    };

    init();

    return () => {
      if (cleanup) cleanup();
    };
  }, [initializeProfile]);

  // Sync form state with profile data
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setBio(profile.bio || '');
      setHasChanges(false);
    }
  }, [profile]);

  // Track changes
  useEffect(() => {
    if (profile) {
      const nameChanged = displayName !== (profile.displayName || '');
      const bioChanged = bio !== (profile.bio || '');
      setHasChanges(nameChanged || bioChanged);
    }
  }, [displayName, bio, profile]);

  // Clear messages after delay
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleSave = async () => {
    try {
      await updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
      });
      setSuccessMessage('Profile updated successfully');
      setHasChanges(false);
    } catch (err) {
      // Error is handled by the store
    }
  };

  const handleCancel = () => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setBio(profile.bio || '');
      setHasChanges(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await uploadAndSetAvatar(file);
        setSuccessMessage('Avatar updated successfully');
      } catch (err) {
        // Error is handled by the store
      }
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const avatarUrl = profile?.avatarUrl || user?.photoURL;

  return (
    <PageContainer>
      <SEO
        title="Profile - Mise"
        description="Manage your Mise profile settings"
        canonical="/profile"
      />

      <Header>
        <HeaderContent>
          <HeaderLeft>
            <BackButton onClick={() => navigate(-1)} title="Go back">
              <span className="material-symbols-outlined">arrow_back</span>
            </BackButton>
            <PageTitle>Profile</PageTitle>
          </HeaderLeft>
          <UserMenu />
        </HeaderContent>
      </Header>

      <MainContent>
        {isLoading ? (
          <ProfileCard>
            <LoadingOverlay>
              <span className="material-symbols-outlined">hourglass_empty</span>
              &nbsp;Loading profile...
            </LoadingOverlay>
          </ProfileCard>
        ) : (
          <ProfileCard>
            {successMessage && (
              <StatusMessage $type="success">
                <span className="material-symbols-outlined">check_circle</span>
                {successMessage}
              </StatusMessage>
            )}

            {error && (
              <StatusMessage $type="error">
                <span className="material-symbols-outlined">error</span>
                {error}
              </StatusMessage>
            )}

            <AvatarSection>
              <AvatarWrapper>
                <UserAvatar
                  src={avatarUrl}
                  name={displayName || profile?.displayName}
                  size="large"
                />
              </AvatarWrapper>
              <ChangeAvatarButton onClick={handleAvatarClick} disabled={isSaving}>
                <span className="material-symbols-outlined">photo_camera</span>
                Change Photo
              </ChangeAvatarButton>
              <HiddenFileInput
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
            </AvatarSection>

            <FormSection>
              <FormGroup>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  disabled={isSaving}
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="bio">Bio</Label>
                <TextArea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us a bit about yourself..."
                  disabled={isSaving}
                />
                <HelpText>Brief description that appears on your profile</HelpText>
              </FormGroup>

              <FormGroup>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                />
                <HelpText>Email is managed by your Google account</HelpText>
              </FormGroup>

              <ButtonRow>
                <Button onClick={handleCancel} disabled={!hasChanges || isSaving}>
                  Cancel
                </Button>
                <Button
                  $primary
                  onClick={handleSave}
                  disabled={!hasChanges || isSaving || !displayName.trim()}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </ButtonRow>
            </FormSection>
          </ProfileCard>
        )}
      </MainContent>
    </PageContainer>
  );
}
