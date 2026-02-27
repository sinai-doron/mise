import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../firebase';
import { findListByInviteCode } from '../firebase/shoppingListSync';
import { useShoppingListStore } from '../stores/shoppingListStore';
import { SEO } from '../components/SEO';
import type { ShoppingList } from '../types/ShoppingList';

const colors = {
  primary: '#2C3E50',
  primaryDark: '#1a252f',
  backgroundLight: '#F0F4F8',
  textMain: '#333333',
  textMuted: '#64748b',
  green500: '#22c55e',
};

const Container = styled.div`
  min-height: 100vh;
  background: ${colors.backgroundLight};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
`;

const Card = styled.div`
  background: white;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(44, 62, 80, 0.12);
  width: 100%;
  max-width: 420px;
  overflow: hidden;
`;

const CardHeader = styled.div`
  background: ${colors.primary};
  padding: 32px 24px;
  text-align: center;
  color: white;
`;

const IconCircle = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;

  .material-symbols-outlined {
    font-size: 32px;
  }
`;

const CardTitle = styled.h1`
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 4px;
`;

const CardSubtitle = styled.p`
  font-size: 14px;
  opacity: 0.8;
  margin: 0;
`;

const CardBody = styled.div`
  padding: 24px;
`;

const ListInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: ${colors.backgroundLight};
  border-radius: 12px;
  margin-bottom: 20px;
`;

const ListIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${colors.primary};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .material-symbols-outlined {
    font-size: 24px;
  }
`;

const ListDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const ListName = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: ${colors.textMain};
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ListOwner = styled.p`
  font-size: 13px;
  color: ${colors.textMuted};
  margin: 4px 0 0;
`;

const MembersBadge = styled.span`
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 8px;
  background: #e0f2fe;
  color: #0369a1;
  white-space: nowrap;
`;

const JoinButton = styled.button`
  width: 100%;
  padding: 16px;
  background: ${colors.primary};
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover:not(:disabled) {
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

const SecondaryButton = styled.button`
  width: 100%;
  padding: 14px;
  background: transparent;
  color: ${colors.textMuted};
  border: 1px solid rgba(44, 62, 80, 0.15);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  margin-top: 10px;
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;

  &:hover {
    background: #f8f9fa;
    color: ${colors.textMain};
    border-color: ${colors.primary};
  }
`;

const StatusMessage = styled.div<{ $type: 'success' | 'error' | 'info' }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 16px;

  ${(props) => {
    switch (props.$type) {
      case 'success':
        return `background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0;`;
      case 'error':
        return `background: #fef2f2; color: #991b1b; border: 1px solid #fecaca;`;
      case 'info':
        return `background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe;`;
    }
  }}

  .material-symbols-outlined {
    font-size: 20px;
    flex-shrink: 0;
  }
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 40px;
  color: ${colors.textMuted};

  .material-symbols-outlined {
    font-size: 40px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  p {
    margin: 12px 0 0;
    font-size: 14px;
  }
`;

const SignInPrompt = styled.div`
  text-align: center;
  padding: 16px 0;
`;

const SignInText = styled.p`
  font-size: 14px;
  color: ${colors.textMuted};
  margin: 0 0 16px;
`;

export function JoinListPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [list, setList] = useState<ShoppingList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);

  const joinList = useShoppingListStore((s) => s.joinList);
  const setActiveList = useShoppingListStore((s) => s.setActiveList);

  // Fetch list info
  useEffect(() => {
    if (!inviteCode || authLoading) return;

    const fetchList = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const foundList = await findListByInviteCode(inviteCode);
        if (foundList) {
          setList(foundList);
          // Check if already a member
          if (user && foundList.memberIds.includes(user.uid)) {
            setAlreadyMember(true);
          }
        } else {
          setError('This invite link is invalid or has been disabled.');
        }
      } catch (err) {
        console.error('Failed to fetch list:', err);
        setError('Something went wrong. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchList();
  }, [inviteCode, authLoading, user]);

  const handleJoin = async () => {
    if (!inviteCode || isJoining) return;
    setIsJoining(true);
    setError(null);
    try {
      const joinedList = await joinList(inviteCode);
      setJoined(true);
      setActiveList(joinedList.id);
      // Navigate to shopping list after a brief delay
      setTimeout(() => navigate('/shopping'), 1500);
    } catch (err) {
      console.error('Failed to join list:', err);
      setError(err instanceof Error ? err.message : 'Failed to join list');
    } finally {
      setIsJoining(false);
    }
  };

  const handleGoToList = () => {
    if (list) {
      setActiveList(list.id);
    }
    navigate('/shopping');
  };

  if (authLoading || isLoading) {
    return (
      <Container>
        <SEO title="Join Shopping List - Prepd" description="Join a shared shopping list." />
        <Card>
          <CardHeader>
            <IconCircle>
              <span className="material-symbols-outlined">group_add</span>
            </IconCircle>
            <CardTitle>Join Shopping List</CardTitle>
          </CardHeader>
          <CardBody>
            <LoadingSpinner>
              <span className="material-symbols-outlined">hourglass_empty</span>
              <p>Loading invite...</p>
            </LoadingSpinner>
          </CardBody>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <SEO
        title={list ? `Join "${list.name}" - Prepd` : 'Join Shopping List - Prepd'}
        description={list ? `Join ${list.ownerName}'s shopping list "${list.name}" on Prepd.` : 'Join a shared shopping list.'}
      />
      <Card>
        <CardHeader>
          <IconCircle>
            <span className="material-symbols-outlined">group_add</span>
          </IconCircle>
          <CardTitle>Join Shopping List</CardTitle>
          <CardSubtitle>You've been invited to collaborate</CardSubtitle>
        </CardHeader>

        <CardBody>
          {error && (
            <StatusMessage $type="error">
              <span className="material-symbols-outlined">error</span>
              {error}
            </StatusMessage>
          )}

          {joined && (
            <StatusMessage $type="success">
              <span className="material-symbols-outlined">check_circle</span>
              You've joined the list! Redirecting...
            </StatusMessage>
          )}

          {alreadyMember && !joined && (
            <StatusMessage $type="info">
              <span className="material-symbols-outlined">info</span>
              You're already a member of this list.
            </StatusMessage>
          )}

          {list && (
            <>
              <ListInfo>
                <ListIcon>
                  <span className="material-symbols-outlined">shopping_cart</span>
                </ListIcon>
                <ListDetails>
                  <ListName>{list.name}</ListName>
                  <ListOwner>by {list.ownerName}</ListOwner>
                </ListDetails>
                <MembersBadge>
                  {list.memberIds.length} member{list.memberIds.length !== 1 ? 's' : ''}
                </MembersBadge>
              </ListInfo>

              {!user ? (
                <SignInPrompt>
                  <SignInText>
                    You need to sign in to join this list.
                  </SignInText>
                  <JoinButton onClick={() => navigate(`/`)}>
                    <span className="material-symbols-outlined">login</span>
                    Sign In to Join
                  </JoinButton>
                </SignInPrompt>
              ) : alreadyMember ? (
                <JoinButton onClick={handleGoToList}>
                  <span className="material-symbols-outlined">shopping_cart</span>
                  Go to List
                </JoinButton>
              ) : !joined ? (
                <JoinButton onClick={handleJoin} disabled={isJoining}>
                  <span className="material-symbols-outlined">group_add</span>
                  {isJoining ? 'Joining...' : 'Join List'}
                </JoinButton>
              ) : null}
            </>
          )}

          {!list && error && (
            <SecondaryButton onClick={() => navigate('/shopping')}>
              Go to Shopping Lists
            </SecondaryButton>
          )}

          {list && !joined && (
            <SecondaryButton onClick={() => navigate('/shopping')}>
              Cancel
            </SecondaryButton>
          )}
        </CardBody>
      </Card>
    </Container>
  );
}
