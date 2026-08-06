import { Drawer, Tag } from 'antd';
import styled from 'styled-components';

export const StyledDrawer = styled(Drawer)`
  .ant-drawer-content,
  .ant-drawer-header,
  .ant-drawer-body {
    background: ${props => props.theme.colors.surface};
    color: ${props => props.theme.colors.text};
  }

  .ant-drawer-header {
    border-bottom-color: ${props => props.theme.colors.border};
  }

  .ant-drawer-title,
  .ant-drawer-close {
    color: ${props => props.theme.colors.text};
  }

  .ant-drawer-body {
    padding: 0;
  }
`;

export const DrawerTitle = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

export const EquipmentImage = styled.img`
  display: block;
  width: 100%;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

export const Content = styled.div`
  display: grid;
  gap: 18px;
  padding: 18px 20px 24px;
`;

export const ReferenceTag = styled(Tag)`
  width: fit-content;
  margin: 0;
  color: ${props => props.theme.colors.accent};
  background: rgba(0, 229, 255, 0.08);
  border-color: rgba(0, 229, 255, 0.35);
`;

export const Identity = styled.div`
  display: grid;
  gap: 4px;
`;

export const EquipmentName = styled.h2`
  margin: 0;
  color: ${props => props.theme.colors.text};
  font-size: 20px;
`;

export const EquipmentType = styled.span`
  color: ${props => props.theme.colors.textMuted};
  font-size: 13px;
`;

export const StatusPanel = styled.div<{ $isAlert: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border: 1px solid ${props => props.$isAlert ? props.theme.colors.danger : props.theme.colors.success};
  border-radius: 6px;
  color: ${props => props.$isAlert ? props.theme.colors.danger : props.theme.colors.success};
  background: ${props => props.$isAlert ? 'rgba(255, 51, 51, 0.07)' : 'rgba(0, 255, 102, 0.06)'};
`;

export const StatusText = styled.div`
  display: grid;
  gap: 3px;

  strong {
    font-size: 13px;
  }

  span {
    color: ${props => props.theme.colors.textMuted};
    font-size: 12px;
    line-height: 1.45;
  }
`;

export const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
`;

export const Metric = styled.div`
  display: grid;
  gap: 4px;
  padding: 10px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 5px;
  background: ${props => props.theme.colors.background};

  span {
    color: ${props => props.theme.colors.textMuted};
    font-size: 10px;
    text-transform: uppercase;
  }

  strong {
    color: ${props => props.theme.colors.accent};
    font-family: ${props => props.theme.fonts.mono};
    font-size: 14px;
  }
`;

export const Section = styled.section`
  display: grid;
  gap: 8px;
`;

export const SectionTitle = styled.h3`
  margin: 0;
  color: ${props => props.theme.colors.text};
  font-size: 13px;
  text-transform: uppercase;
`;

export const Paragraph = styled.p`
  margin: 0;
  color: ${props => props.theme.colors.textMuted};
  font-size: 13px;
  line-height: 1.55;
`;

export const InspectionList = styled.ol`
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 20px;
  color: ${props => props.theme.colors.text};
  font-size: 13px;
  line-height: 1.45;

  li::marker {
    color: ${props => props.theme.colors.accent};
    font-family: ${props => props.theme.fonts.mono};
  }
`;

export const Regulation = styled.div`
  padding-top: 12px;
  border-top: 1px solid ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.textMuted};
  font-size: 12px;
`;

export const Disclaimer = styled.div`
  padding: 10px 12px;
  border-radius: 5px;
  color: ${props => props.theme.colors.textMuted};
  background: ${props => props.theme.colors.surfaceLight};
  font-size: 11px;
  line-height: 1.45;
`;
