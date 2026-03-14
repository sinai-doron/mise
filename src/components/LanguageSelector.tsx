import { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useLanguage, LANGUAGE_META, type UILanguage } from '../i18n/useLanguage';

const Wrapper = styled.div`
  position: relative;
`;

const TriggerButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: rgba(44, 62, 80, 0.08);
  color: #333333;
  transition: background 0.15s;

  &:hover {
    background: rgba(44, 62, 80, 0.14);
  }

  .flag {
    font-size: 16px;
    line-height: 1;
  }

  .name {
    @media (max-width: 768px) {
      display: none;
    }
  }

  .arrow {
    font-size: 14px;
    transition: transform 0.15s;
  }

  &[data-open='true'] .arrow {
    transform: rotate(180deg);
  }
`;

const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 100;
  min-width: 180px;
  max-height: 360px;
  overflow-y: auto;
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(44, 62, 80, 0.1);
  padding: 4px;

  [dir='rtl'] & {
    right: auto;
    left: 0;
  }
`;

const Option = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 7px;
  font-size: 13px;
  font-weight: ${(props) => (props.$active ? 600 : 400)};
  cursor: pointer;
  background: ${(props) => (props.$active ? 'rgba(44, 62, 80, 0.1)' : 'transparent')};
  color: #333333;
  text-align: start;
  transition: background 0.1s;

  &:hover {
    background: rgba(44, 62, 80, 0.07);
  }

  .flag {
    font-size: 16px;
    line-height: 1;
  }
`;

export default function LanguageSelector() {
  const { currentLanguage, changeLanguage, languages } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const meta = LANGUAGE_META[currentLanguage];

  return (
    <Wrapper ref={ref}>
      <TriggerButton onClick={() => setOpen((o) => !o)} data-open={open}>
        <span className="flag">{meta.flag}</span>
        <span className="name">{meta.nativeName}</span>
        <span className="arrow">▾</span>
      </TriggerButton>
      {open && (
        <Dropdown>
          {languages.map((code) => {
            const lang = LANGUAGE_META[code as UILanguage];
            return (
              <Option
                key={code}
                $active={code === currentLanguage}
                onClick={() => {
                  changeLanguage(code);
                  setOpen(false);
                }}
              >
                <span className="flag">{lang.flag}</span>
                {lang.nativeName}
              </Option>
            );
          })}
        </Dropdown>
      )}
    </Wrapper>
  );
}
