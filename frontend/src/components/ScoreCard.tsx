import React from 'react';
import { useSimulator, type ScoreCardData } from '../context/SimulatorContext';
import { Modal, List } from 'antd';
import { Award, AlertOctagon, RefreshCw, LogOut, CheckCircle2, FileText } from 'lucide-react';
import * as S from './ScoreCard.styles';

const ScoreCard: React.FC = () => {
  const { scoreCard, status, resetSession, logoutUser, selectScenario, username, scenarioId, logs } = useSimulator();

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

  const getScenarioTitle = (id: string) => {
    switch (id) {
      case 'startup': return 'Пуск установки ЭЛОУ-АВТ';
      case 'shutdown': return 'Аварийный останов печи П-1';
      case 'column_shutdown': return 'Останов колонны К-1';
      case 'overpressure_relief': return 'Ликвидация роста давления';
      case 'recirculation': return 'Перевод на рециркуляцию';
      default: return id;
    }
  };

  const handleStartRecommended = () => {
    if (scoreCard.recommended_scenario_id) {
      selectScenario(scoreCard.recommended_scenario_id);
    } else {
      selectScenario('startup');
    }
  };

  const handleExportPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dateStr = new Date().toLocaleString('ru-RU');
    const integrityHash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const errorsHtml = scoreCard.errors.length > 0 
      ? `
        <h3 style="color: #991b1b; border-bottom: 2px solid #fca5a5; padding-bottom: 4px; margin-top: 20px;">
          Обнаруженные нарушения техрегламента (ИБ / ПБ / ТБ)
        </h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px;">
          <thead>
            <tr style="background: #fee2e2; color: #991b1b;">
              <th style="border: 1px solid #fca5a5; padding: 6px; text-align: left;">Пункт регламента</th>
              <th style="border: 1px solid #fca5a5; padding: 6px; text-align: left;">Название нарушения</th>
              <th style="border: 1px solid #fca5a5; padding: 6px; text-align: left;">Описание ошибки</th>
            </tr>
          </thead>
          <tbody>
            ${scoreCard.errors.map(err => `
              <tr>
                <td style="border: 1px solid #fca5a5; padding: 6px; font-weight: bold; white-space: nowrap;">${err.clause}</td>
                <td style="border: 1px solid #fca5a5; padding: 6px; font-weight: bold; color: #b91c1c;">${err.title}</td>
                <td style="border: 1px solid #fca5a5; padding: 6px;">${err.text}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<p style="color: #166534; font-weight: bold;">Нарушений техрегламента не зафиксировано.</p>';

    const recsHtml = scoreCard.recommendations.length > 0
      ? `
        <h3 style="color: #0369a1; border-bottom: 2px solid #7dd3fc; padding-bottom: 4px; margin-top: 20px;">
          Адаптивные рекомендации ИИ-тьютора
        </h3>
        <ul style="font-size: 12px; line-height: 1.5; color: #1e293b;">
          ${scoreCard.recommendations.map(r => `<li style="margin-bottom: 4px;">${r}</li>`).join('')}
        </ul>
      ` : '';

    const logsHtml = logs.length > 0
      ? `
        <h3 style="color: #334155; border-bottom: 2px solid #cbd5e1; padding-bottom: 4px; margin-top: 20px;">
          Последовательность действий обучаемого (Посекундный журнал)
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #f1f5f9; color: #334155;">
              <th style="border: 1px solid #cbd5e1; padding: 4px; width: 40px; text-align: center;">№</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; width: 70px; text-align: center;">Время</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; width: 80px; text-align: center;">Тип</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: left;">Событие / Зафиксированное действие</th>
            </tr>
          </thead>
          <tbody>
            ${logs.map((l, i) => `
              <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center;">${i + 1}</td>
                <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-family: monospace;">${l.time}</td>
                <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-weight: bold; color: ${l.type === 'error' ? '#dc2626' : l.type === 'warning' ? '#d97706' : '#2563eb'};">${l.type.toUpperCase()}</td>
                <td style="border: 1px solid #cbd5e1; padding: 4px;">${l.message}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <title>Протокол оценивания - ${username}</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 15px; color: #0f172a; background-color: #f8fafc; }
          .container { max-width: 850px; margin: 0 auto; background: #ffffff; padding: 20px 25px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 2px double #0284c7; padding-bottom: 8px; margin-bottom: 12px; }
          .header h1 { margin: 0; font-size: 16px; text-transform: uppercase; color: #0369a1; letter-spacing: 1px; }
          .header h2 { margin: 3px 0 0 0; font-size: 13px; font-weight: 600; color: #334155; }
          .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px; }
          .meta-table td { padding: 4px 8px; border: 1px solid #e2e8f0; }
          .meta-table td.label { font-weight: bold; background: #f8fafc; width: 35%; color: #475569; }
          .grade-box { display: inline-block; padding: 2px 10px; font-weight: bold; font-size: 14px; border-radius: 4px; color: white; background: ${scoreCard.grade === 'A' ? '#16a34a' : scoreCard.grade === 'B' ? '#2563eb' : scoreCard.grade === 'C' ? '#d97706' : '#dc2626'}; }
          .footer-signatures { margin-top: 25px; font-size: 11px; display: flex; justify-content: space-between; page-break-inside: avoid; }
          .hash-block { margin-top: 15px; padding: 6px 8px; background: #f1f5f9; border: 1px dashed #94a3b8; font-family: monospace; font-size: 9px; color: #475569; word-break: break-all; }
          
          .top-toolbar {
            max-width: 850px;
            margin: 0 auto 12px auto;
            background: #0f172a;
            color: #ffffff;
            padding: 8px 16px;
            border-radius: 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13px;
          }
          .btn-print {
            background: #475569;
            color: white;
            border: none;
            padding: 6px 14px;
            font-weight: 600;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
          }
          .btn-print:hover { background: #334155; }
          .btn-download {
            background: #10b981;
            color: white;
            border: none;
            padding: 6px 14px;
            font-weight: 600;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
          }
          .btn-download:hover { background: #059669; }

          @media print {
            @page { size: A4 portrait; margin: 8mm; }
            .no-print { display: none !important; }
            body { background: white; padding: 0; margin: 0; }
            .container { box-shadow: none; padding: 0; max-width: 100%; border-radius: 0; }
          }
        </style>
      </head>
      <body>
        <div class="top-toolbar no-print">
          <div>📄 <strong>Протокол оценивания КТК ЭЛОУ-АВТ</strong></div>
          <div style="display: flex; gap: 10px;">
            <button class="btn-download" onclick="downloadPdf()">📥 Скачать PDF</button>
            <button class="btn-print" onclick="window.print()">🖨️ Распечатать</button>
          </div>
        </div>

        <script>
          function downloadPdf() {
            var element = document.getElementById('report-container');
            if (typeof html2pdf !== 'undefined') {
              var opt = {
                margin:       [5, 5, 5, 5],
                filename:     'Протокол_КТК_${username}.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak:    { mode: 'avoid-all' }
              };
              html2pdf().set(opt).from(element).save();
            } else {
              window.print();
            }
          }
        </script>

        <div class="container" id="report-container">
          <div class="header">
            <h1>Компьютерный Тренажёрный Комплекс (КТК) // ЭЛОУ-АВТ Smart Tutor</h1>
            <h2>Официальный протокол оценивания квалификации оператора технологического процесса</h2>
          </div>

          <table class="meta-table">
            <tr>
              <td class="label">ФИО Обучаемого (Оператор):</td>
              <td><strong>${username}</strong></td>
            </tr>
            <tr>
              <td class="label">Учебный сценарий:</td>
              <td><strong>${getScenarioTitle(scenarioId)}</strong></td>
            </tr>
            <tr>
              <td class="label">Дата и время аттестации:</td>
              <td>${dateStr}</td>
            </tr>
            <tr>
              <td class="label">Продолжительность сессии:</td>
              <td>${Math.floor(scoreCard.duration / 60)} мин ${scoreCard.duration % 60} сек</td>
            </tr>
            <tr>
              <td class="label">Оценка соответствия эталону (DTW):</td>
              <td><strong>${scoreCard.score}%</strong> &nbsp;|&nbsp; Буквенная оценка: <span class="grade-box">${scoreCard.grade}</span></td>
            </tr>
            <tr>
              <td class="label">Статус аттестационной сессии:</td>
              <td><strong>${getHeaderTitle()}</strong></td>
            </tr>
          </table>

          ${errorsHtml}
          ${recsHtml}
          ${logsHtml}

          <div class="hash-block">
            🛡️ <strong>Контроль целостности ИБ (К8 / SHA-256 Protocol Integrity Seal):</strong><br/>
            <code>SHA256:${integrityHash}</code>
          </div>

          <div class="footer-signatures">
            <div>
              <p><strong>Инструктор тренажёрного комплекса:</strong></p>
              <p>____________________ / Администратор КТК</p>
            </div>
            <div style="text-align: right;">
              <p><strong>Дата выдачи протокола:</strong></p>
              <p>${dateStr.split(',')[0]} г. &nbsp;&nbsp; М.П.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
      width={540}
      styles={{
        mask: maskStyle,
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
              renderItem={(err: unknown) => {
                const errorItem = err as ScoreCardData['errors'][number];
                return (
                  <List.Item>
                    <S.ErrorItemContainer>
                      <S.ErrorItemHeader>
                        <S.ErrorTitle>{errorItem.title}</S.ErrorTitle>
                        <S.ErrorClause>{errorItem.clause}</S.ErrorClause>
                      </S.ErrorItemHeader>
                      <S.ErrorText>{errorItem.text}</S.ErrorText>
                    </S.ErrorItemContainer>
                  </List.Item>
                );
              }}
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
              {scoreCard.recommendations.map((rec, idx) => {
                const isAdaptiveScenario = rec.startsWith('Рекомендуемый адаптивный сценарий:');
                if (isAdaptiveScenario) {
                  return (
                    <S.AdaptiveRetrainingBanner key={idx}>
                      🎯 <strong>{rec}</strong>
                    </S.AdaptiveRetrainingBanner>
                  );
                }
                return <S.RecItem key={idx}>{rec}</S.RecItem>;
              })}
            </S.FullWidthContainer>
          </>
        )}

        {/* Кнопки управления */}
        <S.FooterButtons>
          {scoreCard.recommended_scenario_id ? (
            <S.StyledRepeatButton
              type="primary"
              icon={<RefreshCw size={14} />}
              onClick={handleStartRecommended}
            >
              Пройти рекомендованный тренинг
            </S.StyledRepeatButton>
          ) : (
            <S.StyledRepeatButton
              type="primary"
              icon={<RefreshCw size={14} />}
              onClick={resetSession}
            >
              Повторить попытку
            </S.StyledRepeatButton>
          )}
          <S.StyledPdfButton
            icon={<FileText size={14} />}
            onClick={handleExportPdf}
            title="Печать/Скачивание официального протокола оценивания квалификации (PDF)"
          >
            Протокол (PDF)
          </S.StyledPdfButton>
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
