import React from 'react';
import { useTelemetry } from '@/entities/telemetry';
import { useSession, type ScoreCardError } from '@/entities/session';
import { useSimulatorActions } from '@/entities/simulator';
import { formatTime } from '@/shared/lib';
import { Modal } from 'antd';

import { Award, AlertOctagon, RefreshCw, LogOut, CheckCircle2, FileText, ArrowRight, GraduationCap, RotateCcw, ListOrdered, Clock } from 'lucide-react';
import * as S from './ScoreCard.styles';

/**
 * Бэкенд локализует нарушение во времени тремя способами, и путать их нельзя:
 * привязка к шагу оператора, проверка итогового состояния и неизвестный момент.
 * Для второго случая at_second равен длительности сессии — это не «ошибка на
 * последней секунде», а итоговая проверка, поэтому и подпись другая.
 */
const describeErrorMoment = (error: ScoreCardError): { label: string; hint: string; kind: 'action' | 'final' } | null => {
  const { at_second, action_index, action } = error;

  if (at_second === null || at_second === undefined) return null;

  if (action_index !== null && action_index !== undefined) {
    return {
      label: `${formatTime(at_second)} · шаг ${action_index + 1}${action ? ` (${action})` : ''}`,
      hint: 'Нарушение зафиксировано на конкретном действии оператора',
      kind: 'action',
    };
  }

  return {
    label: 'по итогу сессии',
    hint: `Проверка итогового состояния установки на момент завершения (${formatTime(at_second)})`,
    kind: 'final',
  };
};

const ScoreCard: React.FC = () => {
  const { status, logs } = useTelemetry();
  const { scoreCard, username, scenarioId, mode } = useSession();
  const { resetSession, logoutUser, selectScenario, selectMode } = useSimulatorActions();

  if (!scoreCard) return null;

  const timeline = scoreCard.timeline ?? [];
  // Шаги, на которых зафиксированы нарушения — подсвечиваем их в хронологии
  const erroneousStepIndexes = new Set(
    scoreCard.errors
      .map(e => e.action_index)
      .filter((i): i is number => i !== null && i !== undefined),
  );

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
      case 'pump_fail': return 'Отказ сырьевого насоса Н-1';
      case 'coil_overheat': return 'Прогар змеевика печи П-1';
      case 'valve_jam': return 'Зависание клапана сброса V-2';
      case 'power_fail': return 'Отказ электроснабжения';
      case 'air_fail': return 'Отказ воздуха КИПиА';
      case 'steam_fail': return 'Срыв подачи отпарного пара';
      default: return id;
    }
  };

  const targetScenarioId = scoreCard.recommended_scenario_id || (isSuccess ? 'shutdown' : scenarioId);
  const targetScenarioTitle = getScenarioTitle(targetScenarioId);

  let primaryButtonText = `🎓 Следующий шаг: ${targetScenarioTitle}`;
  let PrimaryIcon = ArrowRight;

  if (mode === 'exam') {
    if (isSuccess) {
      primaryButtonText = `🎯 Сдать Экзамен: ${targetScenarioTitle}`;
      PrimaryIcon = Award;
    } else {
      primaryButtonText = `🎓 Перейти в Обучение: ${targetScenarioTitle}`;
      PrimaryIcon = GraduationCap;
    }
  } else {
    if (isSuccess) {
      primaryButtonText = `🎓 Следующий шаг: ${targetScenarioTitle}`;
      PrimaryIcon = ArrowRight;
    } else {
      primaryButtonText = `🎓 Дообучение: ${targetScenarioTitle}`;
      PrimaryIcon = RefreshCw;
    }
  }

  const handlePrimaryAction = () => {
    if (mode === 'exam' && !isSuccess) {
      selectMode('training');
    }
    selectScenario(targetScenarioId);
  };

  /** Протокол собирается как HTML-строка, поэтому любые данные сессии экранируются */
  const escapeHtml = (value: string | number) =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const handleExportPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dateStr = new Date().toLocaleString('ru-RU');

    const errorsHtml = scoreCard.errors.length > 0 
      ? `
        <h3 style="color: #991b1b; border-bottom: 2px solid #fca5a5; padding-bottom: 4px; margin-top: 20px;">
          Обнаруженные нарушения техрегламента (ИБ / ПБ / ТБ)
        </h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px;">
          <thead>
            <tr style="background: #fee2e2; color: #991b1b;">
              <th style="border: 1px solid #fca5a5; padding: 6px; text-align: left; white-space: nowrap;">Момент</th>
              <th style="border: 1px solid #fca5a5; padding: 6px; text-align: left;">Пункт регламента</th>
              <th style="border: 1px solid #fca5a5; padding: 6px; text-align: left;">Название нарушения</th>
              <th style="border: 1px solid #fca5a5; padding: 6px; text-align: left;">Описание ошибки</th>
            </tr>
          </thead>
          <tbody>
            ${scoreCard.errors.map(err => {
              const moment = describeErrorMoment(err);
              return `
              <tr>
                <td style="border: 1px solid #fca5a5; padding: 6px; white-space: nowrap; font-family: monospace; font-size: 11px;">${escapeHtml(moment ? moment.label : '—')}</td>
                <td style="border: 1px solid #fca5a5; padding: 6px; font-weight: bold; white-space: nowrap;">${escapeHtml(err.clause)}</td>
                <td style="border: 1px solid #fca5a5; padding: 6px; font-weight: bold; color: #b91c1c;">${escapeHtml(err.title)}</td>
                <td style="border: 1px solid #fca5a5; padding: 6px;">${escapeHtml(err.text)}</td>
              </tr>
            `;}).join('')}
          </tbody>
        </table>
      ` : '<p style="color: #166534; font-weight: bold;">Нарушений техрегламента не зафиксировано.</p>';

    const recsHtml = scoreCard.recommendations.length > 0
      ? `
        <h3 style="color: #0369a1; border-bottom: 2px solid #7dd3fc; padding-bottom: 4px; margin-top: 20px;">
          Адаптивные рекомендации ИИ-тьютора
        </h3>
        <ul style="font-size: 12px; line-height: 1.5; color: #1e293b;">
          ${scoreCard.recommendations.map(r => `<li style="margin-bottom: 4px;">${escapeHtml(r)}</li>`).join('')}
        </ul>
      ` : '';

    const timelineHtml = timeline.length > 0
      ? `
        <h3 style="color: #334155; border-bottom: 2px solid #cbd5e1; padding-bottom: 4px; margin-top: 20px;">
          Хронология действий оператора (локализация нарушений во времени)
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 10px;">
          <thead>
            <tr style="background: #f1f5f9; color: #334155;">
              <th style="border: 1px solid #cbd5e1; padding: 4px; width: 50px; text-align: center;">Шаг</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; width: 70px; text-align: center;">Время</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: left;">Действие</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; width: 110px; text-align: center;">Оценка</th>
            </tr>
          </thead>
          <tbody>
            ${timeline.map(step => {
              const failed = erroneousStepIndexes.has(step.index);
              return `
              <tr style="background: ${failed ? '#fef2f2' : '#ffffff'};">
                <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center;">${step.index + 1}</td>
                <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-family: monospace;">${escapeHtml(formatTime(step.at_second))}</td>
                <td style="border: 1px solid #cbd5e1; padding: 4px; font-family: monospace;">${escapeHtml(step.action)}</td>
                <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-weight: bold; color: ${failed ? '#dc2626' : '#166534'};">${failed ? 'Нарушение' : 'Норма'}</td>
              </tr>
            `;}).join('')}
          </tbody>
        </table>
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
                <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-family: monospace;">${escapeHtml(l.time)}</td>
                <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-weight: bold; color: ${l.type === 'error' ? '#dc2626' : l.type === 'warning' ? '#d97706' : '#2563eb'};">${escapeHtml(l.type.toUpperCase())}</td>
                <td style="border: 1px solid #cbd5e1; padding: 4px;">${escapeHtml(l.message)}</td>
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
        <title>Протокол оценивания - ${escapeHtml(username)}</title>
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
                filename:     'Протокол_КТК_${username.replace(/[^\p{L}\p{N}_-]/gu, '_')}.pdf',
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
              <td><strong>${escapeHtml(username)}</strong></td>
            </tr>
            <tr>
              <td class="label">Учебный сценарий:</td>
              <td><strong>${escapeHtml(getScenarioTitle(scenarioId))}</strong></td>
            </tr>
            <tr>
              <td class="label">Режим тренажёра:</td>
              <td><strong>${mode === 'exam' ? '🎯 Экзамен (Контроль ГОСТ)' : '🎓 Обучение (Подсказки)'}</strong></td>
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
          ${timelineHtml}
          ${recsHtml}
          ${logsHtml}

          <div class="hash-block">
            🛡️ <strong>Контроль целостности ИБ (К8):</strong><br/>
            Запись сессии защищена контрольной суммой SHA-256 на сервере КТК.
            Проверка целостности выполняется при просмотре записи в АРМ инструктора
            (колонка «ИБ Контроль (ГОСТ)»); печатная копия протокола носит справочный характер.
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
      width={580}
      styles={{
        mask: maskStyle,
      }}
    >
      <S.CardContainer>
        {/* Крупная буква оценки */}
        <S.GradeBadge $grade={scoreCard.grade}>
          {scoreCard.grade}
        </S.GradeBadge>

        <S.CenterTextContainer>
          <S.HeaderTitle color={getHeaderColor()}>
            {getHeaderTitle()}
          </S.HeaderTitle>
          <S.HeaderSubtitle>
            Параметры сессии верифицированы ИИ по требованиям безопасности ({mode === 'exam' ? 'Экзаменационный контроль' : 'Обучающий режим'})
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

        {/* Хронология действий с подсветкой ошибочных шагов */}
        {timeline.length > 0 && (
          <>
            <S.SectionTitle>
              <ListOrdered size={14} color="#00e5ff" />
              Хронология действий оператора
            </S.SectionTitle>
            <S.TimelineContainer>
              {timeline.map(step => (
                <S.TimelineStepBox key={step.index} $hasError={erroneousStepIndexes.has(step.index)}>
                  <span className="action">{step.action}</span>
                  <span className="at">{formatTime(step.at_second)}</span>
                </S.TimelineStepBox>
              ))}
            </S.TimelineContainer>
          </>
        )}

        {/* Нарушенные пункты техрегламента */}
        {scoreCard.errors.length > 0 && (
          <>
            <S.SectionTitle>
              <AlertOctagon size={14} color="#ff3333" />
              Обнаруженные нарушения регламента
            </S.SectionTitle>
            <S.ErrorsContainer>
              {scoreCard.errors.map((errorItem, idx) => {
                const moment = describeErrorMoment(errorItem);
                return (
                  <S.ErrorItemCard key={idx}>
                    <S.ErrorItemContainer>
                      <S.ErrorItemHeader>
                        <S.ErrorTitle>{errorItem.title}</S.ErrorTitle>
                        {moment && (
                          <S.ErrorMoment
                            $kind={moment.kind}
                            title={moment.hint}
                          >
                            <Clock size={9} />
                            {moment.label}
                          </S.ErrorMoment>
                        )}
                        <S.ErrorClause>{errorItem.clause}</S.ErrorClause>
                      </S.ErrorItemHeader>
                      <S.ErrorText>{errorItem.text}</S.ErrorText>
                    </S.ErrorItemContainer>
                  </S.ErrorItemCard>
                );
              })}
            </S.ErrorsContainer>
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
                const isAdaptiveScenario = rec.includes('Рекомендуемый');
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
        <S.FooterContainer>
          <S.PrimaryActionButton
            type="primary"
            icon={<PrimaryIcon size={16} />}
            onClick={handlePrimaryAction}
          >
            {primaryButtonText}
          </S.PrimaryActionButton>

          <S.SecondaryButtonsRow>
            <S.StyledSecondaryButton
              icon={<RotateCcw size={14} />}
              onClick={resetSession}
              title="Повторить текущую попытку заново"
            >
              Повторить попытку
            </S.StyledSecondaryButton>
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
          </S.SecondaryButtonsRow>
        </S.FooterContainer>
      </S.CardContainer>
    </Modal>
  );
};

export default ScoreCard;
