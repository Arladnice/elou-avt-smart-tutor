import React from 'react';
import { useSimulator } from '../context/SimulatorContext';
import { Modal, List } from 'antd';
import { Award, AlertOctagon, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react';
import * as S from './ScoreCard.styles';

const ScoreCard: React.FC = () => {
  const { scoreCard, status, resetSession, logoutUser } = useSimulator();

  if (!scoreCard) return null;

  const isSuccess = scoreCard.score >= 80;

  const getHeaderTitle = () => {
    if (isSuccess) return 'ЭКЗАМЕН УСПЕШНО СДАН!';
    if (status === 'accident') return 'ТРЕНИРОВКА ПРОВАЛЕНА (АВАРИЯ)';
    if (status === 'esd') return 'ТРЕНИРОВКА ПРОВАЛЕНА (АВАРИЙНЫЙ ОСТАНОВ)';
    return 'ТРЕНИРОВКА ПРОВАЛЕНА (НИЗКИЙ БАЛЛ)';
  };

  const getHeaderColor = () => {
    if (isSuccess) return '#00ff66';
    if (status === 'accident' || status === 'esd') return '#ff3333';
    return '#ff9900';
  };

  const maskStyle = { backdropFilter: 'blur(4px)' };

  return (
    <Modal
      open={true}
      centered
      title={
        <S.ModalTitle>
          <Award size={16} color="#00e5ff" />
          Карточка оценки квалификации оператора (ScoreCard)
        </S.ModalTitle>
      }
      footer={null}
      closable={false}
      width={500}
      styles={{
        mask: maskStyle
      }}
    >
      <S.CardContainer>
        {/* Крупная буква оценки */}
        <S.GradeBadge grade={scoreCard.grade}>
          {scoreCard.grade}
        </S.GradeBadge>

        <S.CenterTextContainer>
          <S.HeaderTitle color={getHeaderColor()}>
            {getHeaderTitle()}
          </S.HeaderTitle>
          <S.HeaderSubtitle>
            Параметры сессии верифицированы ИИ по требованиям безопасности
          </S.HeaderSubtitle>
        </S.CenterTextContainer>

        {/* Статистика сессии */}
        <S.StatRow>
          <S.StatItem>
            <span className="label">Соответствие эталону (DTW)</span>
            <span className="val">{scoreCard.score}%</span>
          </S.StatItem>
          <S.StatItem>
            <span className="label">Время сессии</span>
            <span className="val">{Math.floor(scoreCard.duration / 60)} мин {scoreCard.duration % 60} сек</span>
          </S.StatItem>
          <S.StatItem>
            <span className="label">Нарушения ИБ/ТБ</span>
            <span className="val">{scoreCard.errors.length}</span>
          </S.StatItem>
        </S.StatRow>

        {/* Нарушенные пункты техрегламента */}
        {scoreCard.errors.length > 0 && (
          <>
            <S.SectionTitle>
              <AlertOctagon size={14} color="#ff3333" />
              Обнаруженные нарушения регламента
            </S.SectionTitle>
            <S.StyledList
              dataSource={scoreCard.errors}
              renderItem={(err: any) => (
                <List.Item>
                  <S.ErrorItemContainer>
                    <S.ErrorItemHeader>
                      <S.ErrorTitle>{err.title}</S.ErrorTitle>
                      <S.ErrorClause>{err.clause}</S.ErrorClause>
                    </S.ErrorItemHeader>
                    <S.ErrorText>{err.text}</S.ErrorText>
                  </S.ErrorItemContainer>
                </List.Item>
              )}
            />
          </>
        )}

        {/* Адаптивные рекомендации ИИ */}
        {scoreCard.recommendations.length > 0 && (
          <>
            <S.SectionTitle>
              <CheckCircle2 size={14} color="#00e5ff" />
              Адаптивные рекомендации ИИ-тьютора
            </S.SectionTitle>
            <S.FullWidthContainer>
              {scoreCard.recommendations.map((rec, idx) => (
                <S.RecItem key={idx}>{rec}</S.RecItem>
              ))}
            </S.FullWidthContainer>
          </>
        )}

        {/* Кнопки управления */}
        <S.FooterButtons>
          <S.StyledRepeatButton 
            type="primary" 
            icon={<RefreshCw size={14} />} 
            onClick={resetSession}
          >
            Повторить попытку
          </S.StyledRepeatButton>
          <S.StyledExitButton 
            icon={<LogOut size={14} />} 
            onClick={logoutUser}
          >
            Выйти
          </S.StyledExitButton>
        </S.FooterButtons>
      </S.CardContainer>
    </Modal>
  );
};

export default ScoreCard;
