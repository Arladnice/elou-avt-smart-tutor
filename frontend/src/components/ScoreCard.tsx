import React from 'react';
import styled from 'styled-components';
import { useSimulator } from '../context/SimulatorContext';
import { Modal, Button, List } from 'antd';
import { Award, AlertOctagon, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react';

const CardContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 10px 0;
`;

const GradeBadge = styled.div<{ grade: string }>`
  width: 90px;
  height: 90px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42px;
  font-weight: 900;
  color: white;
  background-color: ${props => {
    if (props.grade === 'A') return props.theme.colors.success;
    if (props.grade === 'B') return '#0070f3';
    if (props.grade === 'C') return props.theme.colors.warning;
    return props.theme.colors.danger;
  }};
  box-shadow: 0 0 20px ${props => {
    if (props.grade === 'A') return 'rgba(0, 255, 102, 0.4)';
    if (props.grade === 'B') return 'rgba(0, 112, 243, 0.4)';
    if (props.grade === 'C') return 'rgba(255, 204, 0, 0.4)';
    return 'rgba(255, 51, 51, 0.4)';
  }};
  border: 4px solid #111620;
`;

const StatRow = styled.div`
  display: flex;
  justify-content: space-around;
  width: 100%;
  background: #141b27;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid ${props => props.theme.colors.border};
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  span.label {
    font-size: 10px;
    font-weight: 600;
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
  }

  span.val {
    font-family: ${props => props.theme.fonts.mono};
    font-size: 16px;
    font-weight: 700;
    color: ${props => props.theme.colors.text};
  }
`;

const SectionTitle = styled.h3`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: ${props => props.theme.colors.text};
  align-self: flex-start;
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  width: 100%;
  padding-bottom: 4px;
`;

const StyledList = styled(List)`
  width: 100%;
  max-height: 180px;
  overflow-y: auto;
  
  .ant-list-item {
    padding: 8px 12px;
    border-color: ${props => props.theme.colors.border};
    background-color: #0b0f17;
    margin-bottom: 6px;
    border-radius: 4px;
  }
`;

const ErrorTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${props => props.theme.colors.danger};
`;

const ErrorClause = styled.span`
  background: rgba(255, 51, 51, 0.15);
  color: ${props => props.theme.colors.danger};
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 3px;
  margin-left: 8px;
  text-transform: uppercase;
`;

const ErrorText = styled.p`
  font-size: 11px;
  color: ${props => props.theme.colors.textMuted};
  margin-top: 4px;
  line-height: 1.4;
`;

const RecItem = styled.div`
  font-size: 11px;
  color: ${props => props.theme.colors.text};
  line-height: 1.4;
  padding: 6px 12px;
  background: rgba(0, 229, 255, 0.05);
  border-left: 3px solid ${props => props.theme.colors.accent};
  border-radius: 0 4px 4px 0;
  margin-bottom: 6px;
  width: 100%;
`;

const FooterButtons = styled.div`
  display: flex;
  gap: 12px;
  width: 100%;
  margin-top: 15px;
`;

const ScoreCard: React.FC = () => {
  const { scoreCard, resetSession, logoutUser } = useSimulator();

  if (!scoreCard) return null;

  const isSuccess = scoreCard.score >= 80;

  return (
    <Modal
      open={true}
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e1e7f0', fontSize: '15px' }}>
          <Award size={16} color="#00e5ff" />
          Карточка оценки квалификации оператора (ScoreCard)
        </span>
      }
      footer={null}
      closable={false}
      width={500}
      styles={{
        mask: { backdropFilter: 'blur(4px)' }
      }}
    >
      <CardContainer>
        {/* Крупная буква оценки */}
        <GradeBadge grade={scoreCard.grade}>
          {scoreCard.grade}
        </GradeBadge>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: isSuccess ? '#00ff66' : '#ff3333' }}>
            {isSuccess ? 'ЭКЗАМЕН УСПЕШНО СДАН!' : 'ТРЕНИРОВКА ПРОВАЛЕНА / АВАРИЯ'}
          </h2>
          <p style={{ fontSize: '11px', color: '#7c8ba1', marginTop: '2px' }}>
            Параметры сессии верифицированы ИИ по требованиям безопасности
          </p>
        </div>

        {/* Статистика сессии */}
        <StatRow>
          <StatItem>
            <span className="label">Соответствие эталону (DTW)</span>
            <span className="val">{scoreCard.score}%</span>
          </StatItem>
          <StatItem>
            <span className="label">Время сессии</span>
            <span className="val">{Math.floor(scoreCard.duration / 60)} мин {scoreCard.duration % 60} сек</span>
          </StatItem>
          <StatItem>
            <span className="label">Нарушения ИБ/ТБ</span>
            <span className="val">{scoreCard.errors.length}</span>
          </StatItem>
        </StatRow>

        {/* Нарушенные пункты техрегламента */}
        {scoreCard.errors.length > 0 && (
          <>
            <SectionTitle>
              <AlertOctagon size={14} color="#ff3333" />
              Обнаруженные нарушения регламента
            </SectionTitle>
            <StyledList
              dataSource={scoreCard.errors}
              renderItem={(err: any) => (
                <List.Item>
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <ErrorTitle>{err.title}</ErrorTitle>
                      <ErrorClause>{err.clause}</ErrorClause>
                    </div>
                    <ErrorText>{err.text}</ErrorText>
                  </div>
                </List.Item>
              )}
            />
          </>
        )}

        {/* Адаптивные рекомендации ИИ */}
        {scoreCard.recommendations.length > 0 && (
          <>
            <SectionTitle>
              <CheckCircle2 size={14} color="#00e5ff" />
              Адаптивные рекомендации ИИ-тьютора
            </SectionTitle>
            <div style={{ width: '100%' }}>
              {scoreCard.recommendations.map((rec, idx) => (
                <RecItem key={idx}>{rec}</RecItem>
              ))}
            </div>
          </>
        )}

        {/* Кнопки управления */}
        <FooterButtons>
          <Button 
            type="primary" 
            icon={<RefreshCw size={14} />} 
            onClick={resetSession}
            style={{ 
              flex: 1, 
              height: 38, 
              backgroundColor: 'rgba(0, 229, 255, 0.1)', 
              borderColor: '#00e5ff', 
              color: '#00e5ff',
              fontWeight: 600,
              textTransform: 'uppercase'
            }}
          >
            Повторить попытку
          </Button>
          <Button 
            icon={<LogOut size={14} />} 
            onClick={logoutUser}
            style={{ 
              height: 38, 
              backgroundColor: '#0a0e14', 
              borderColor: '#222c3e', 
              color: '#7c8ba1',
              fontWeight: 600,
              textTransform: 'uppercase'
            }}
          >
            Выйти
          </Button>
        </FooterButtons>
      </CardContainer>
    </Modal>
  );
};

export default ScoreCard;
