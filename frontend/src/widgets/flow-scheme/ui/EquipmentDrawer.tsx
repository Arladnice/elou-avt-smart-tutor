import React from 'react';
import { AlertTriangle, Camera, CheckCircle2, MapPin } from 'lucide-react';
import { useTelemetry } from '@/entities/telemetry';
import { EQUIPMENT_CATALOG, type EquipmentId } from '../model/equipmentCatalog';
import * as S from './EquipmentDrawer.styles';

interface EquipmentDrawerProps {
  equipmentId: EquipmentId | null;
  onClose: () => void;
}

const EquipmentDrawer: React.FC<EquipmentDrawerProps> = ({ equipmentId, onClose }) => {
  const { sensors, valves, defects } = useTelemetry();
  const equipment = equipmentId ? EQUIPMENT_CATALOG[equipmentId] : null;

  if (!equipment) return null;

  const activeDefect = equipment.relatedDefects.find(defectId => defects[defectId]);
  const isAlert = Boolean(activeDefect);
  const inspectionSteps = activeDefect
    ? equipment.emergencyInspection[activeDefect] ?? equipment.normalInspection
    : equipment.normalInspection;
  const metrics = equipment.getMetrics(sensors, valves);

  return (
    <S.StyledDrawer
      title={(
        <S.DrawerTitle>
          <Camera size={17} />
          Карточка оборудования · {equipment.tag}
        </S.DrawerTitle>
      )}
      placement="right"
      size={430}
      open
      onClose={onClose}
      destroyOnHidden
    >
      <S.EquipmentImage src={equipment.image} alt={`${equipment.name} ${equipment.tag}`} />
      <S.Content>
        <S.ReferenceTag>Фотореференс типового оборудования</S.ReferenceTag>

        <S.Identity>
          <S.EquipmentName>{equipment.name} {equipment.tag}</S.EquipmentName>
          <S.EquipmentType>{equipment.type}</S.EquipmentType>
        </S.Identity>

        <S.StatusPanel $isAlert={isAlert}>
          {isAlert ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <S.StatusText>
            <strong>{isAlert ? 'Требуется полевой осмотр' : 'Нештатные признаки не выявлены'}</strong>
            <span>
              {isAlert
                ? 'В модели активна связанная неисправность. Выполните безопасную проверку по месту.'
                : 'Доступен учебный перечень контрольного обхода оборудования.'}
            </span>
          </S.StatusText>
        </S.StatusPanel>

        <S.MetricsGrid>
          {metrics.map(metric => (
            <S.Metric key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </S.Metric>
          ))}
        </S.MetricsGrid>

        <S.Section>
          <S.SectionTitle>Назначение</S.SectionTitle>
          <S.Paragraph>{equipment.purpose}</S.Paragraph>
        </S.Section>

        <S.Section>
          <S.SectionTitle>Расположение</S.SectionTitle>
          <S.Paragraph><MapPin size={13} /> {equipment.location}</S.Paragraph>
        </S.Section>

        <S.Section>
          <S.SectionTitle>{isAlert ? 'Действия полевого оператора' : 'Контрольный обход'}</S.SectionTitle>
          <S.InspectionList>
            {inspectionSteps.map(step => <li key={step}>{step}</li>)}
          </S.InspectionList>
        </S.Section>

        <S.Regulation>{equipment.regulation}</S.Regulation>
        <S.Disclaimer>
          Сгенерированная иллюстрация показывает типовое оборудование и не является фотографией конкретной установки. Не заменяет исполнительную документацию и производственные инструкции.
        </S.Disclaimer>
      </S.Content>
    </S.StyledDrawer>
  );
};

export default EquipmentDrawer;
