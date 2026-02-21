import styled from 'styled-components';

// Color palette
const colors = {
  primary: '#2C3E50',
  primaryLight: '#3d566e',
  surface: '#ffffff',
  textMuted: '#64748b',
};

interface AvatarContainerProps {
  $size: 'small' | 'medium' | 'large';
}

const sizeMap = {
  small: 32,
  medium: 48,
  large: 120,
};

const fontSizeMap = {
  small: 12,
  medium: 18,
  large: 40,
};

const AvatarContainer = styled.div<AvatarContainerProps>`
  width: ${(props) => sizeMap[props.$size]}px;
  height: ${(props) => sizeMap[props.$size]}px;
  border-radius: 50%;
  overflow: hidden;
  background: ${colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 2px solid ${colors.surface};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const AvatarInitials = styled.span<AvatarContainerProps>`
  color: ${colors.surface};
  font-size: ${(props) => fontSizeMap[props.$size]}px;
  font-weight: 600;
  text-transform: uppercase;
  user-select: none;
`;

interface UserAvatarProps {
  src?: string | null;
  name?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  onClick?: () => void;
}

// Get initials from name (max 2 characters)
const getInitials = (name?: string): string => {
  if (!name) return '?';

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0);
  }
  return parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
};

export function UserAvatar({
  src,
  name,
  size = 'medium',
  className,
  onClick,
}: UserAvatarProps) {
  return (
    <AvatarContainer
      $size={size}
      className={className}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {src ? (
        <AvatarImage src={src} alt={name || 'User avatar'} />
      ) : (
        <AvatarInitials $size={size}>{getInitials(name)}</AvatarInitials>
      )}
    </AvatarContainer>
  );
}
