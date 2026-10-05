import React, { useState } from 'react';
import { QRCode, message } from 'antd';
import { QrCode, Copy, Check, Sparkles, Cpu, ShieldCheck, Flame, Layers, KeyRound } from 'lucide-react';
import * as S from './JuryQrModal.styles';

interface JuryQrModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEMO_URL = 'https://elou-avt-smart-tutor-ngjl.onrender.com/?demo=operator';

export const JuryQrModal: React.FC<JuryQrModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(DEMO_URL);
      setCopied(true);
      message.success('Ссылка скопирована в буфер обмена');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      message.error('Не удалось скопировать ссылку');
    }
  };

  return (
    <S.StyledModal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      title={
        <>
          <QrCode size={18} />
          <span>Быстрый мобильный доступ экспертов и жюри</span>
        </>
      }
      width={640}
      centered
      destroyOnClose
    >
      <S.ModalBody>
        <S.TopSection>
          <S.QrWrapper>
            <QRCode
              value={DEMO_URL}
              size={168}
              bordered={false}
              color="#0f172a"
              errorLevel="M"
            />
            <S.QrCaption>Сканируйте смартфоном</S.QrCaption>
          </S.QrWrapper>

          <S.DescriptionCol>
            <S.HighlightBadge>
              <Sparkles size={12} />
              Живая демонстрация системы (Live Demo)
            </S.HighlightBadge>
            <S.Heading>Интерактивная сессия КТК ЭЛОУ-АВТ</S.Heading>
            <S.Subtext>
              Отсканируйте QR-код для открытия веб-интерфейса прямо на мобильном устройстве или планшете жюри. Поддерживается управление арматурой, просмотр 3D-двойника и SCADA-мнемосхемы в реальном времени.
            </S.Subtext>

            <S.CredentialsBox>
              <S.CredentialsHeader>
                <KeyRound size={12} />
                <span>Быстрый доступ (авторизация по QR без ввода):</span>
              </S.CredentialsHeader>
              <S.CredentialsContent>
                <span>Операторы: <code>operator_1</code> .. <code>operator_7</code></span>
                <span>Инструктор: <code>instructor_1</code></span>
                <span>Пароль: <code>Ktk_2026!</code></span>
              </S.CredentialsContent>
              <S.CredentialsNote>
                При сканировании каждому эксперту автоматически выделяется независимый оператор и изолированная сессия симулятора.
              </S.CredentialsNote>
            </S.CredentialsBox>

            <S.LinkRow title={DEMO_URL}>
              <span>{DEMO_URL}</span>
            </S.LinkRow>

            <div>
              <S.CopyBtn type="button" onClick={handleCopy}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Скопировано!' : 'Скопировать URL'}
              </S.CopyBtn>
            </div>
          </S.DescriptionCol>
        </S.TopSection>

        <S.AdvantagesCard>
          <S.AdvantageTitle>
            <ShieldCheck size={14} />
            Ключевые технологические преимущества перед решениями конкурентов:
          </S.AdvantageTitle>
          <S.AdvantageGrid>
            <S.AdvantageItem>
              <S.ItemTitle>
                <Cpu size={12} /> Физико-химический симулятор
              </S.ItemTitle>
              <S.ItemDesc>
                Собственный расчет фазовых равновесий, дифференциальные уравнения термодинамики печей и колонн К-1/К-2 (не муляж и не внешняя SCADA).
              </S.ItemDesc>
            </S.AdvantageItem>

            <S.AdvantageItem>
              <S.ItemTitle>
                <ShieldCheck size={12} /> 0 байт раздутого видео (HMAC-SHA256)
              </S.ItemTitle>
              <S.ItemDesc>
                Детерминированный временной ряд телеметрии с криптографической защитой от подмены результатов (вместо 4 ТБ тяжеловесного захвата экранов).
              </S.ItemDesc>
            </S.AdvantageItem>

            <S.AdvantageItem>
              <S.ItemTitle>
                <Flame size={12} /> Нейросеть предиктора риска (ONNX)
              </S.ItemTitle>
              <S.ItemDesc>
                LSTM-модель прогнозирует вероятность аварии за 30–60 секунд до сработки ПАЗ с точностью R² &gt; 0.94 и нулевой задержкой инференса.
              </S.ItemDesc>
            </S.AdvantageItem>

            <S.AdvantageItem>
              <S.ItemTitle>
                <Layers size={12} /> RAG-тьютор и 3D WebGL двойник
              </S.ItemTitle>
              <S.ItemDesc>
                Интеллектуальный разбор ошибок с пунктами техрегламента, светлая/темная тема, интерактивная фильтрация сред и контроль оборудования.
              </S.ItemDesc>
            </S.AdvantageItem>
          </S.AdvantageGrid>
        </S.AdvantagesCard>
      </S.ModalBody>
    </S.StyledModal>
  );
};
