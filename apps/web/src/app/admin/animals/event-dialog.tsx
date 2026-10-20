'use client';

import * as React from 'react';
import {
  Button,
  FormDialog,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@xfarm/ui';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { apiFetch, ApiError } from '../../../lib/api';
import {
  AnimalItem,
  AnimalEventType,
  AnimalSex,
  ANIMAL_SEX_LABELS,
  ANIMAL_EVENT_TYPE_LABELS,
  getAllowedEventTypes,
} from './types';

export interface OffspringItem {
  tag: string;
  sex: AnimalSex;
  species: string;
  breed: string;
}

export interface EventFormProps {
  animal: AnimalItem;
  userRole?: string | null;
  onSuccess: () => void;
  onCancel?: () => void;
  initialEventType?: AnimalEventType;
}

export function EventForm({
  animal,
  userRole,
  onSuccess,
  onCancel,
  initialEventType,
}: EventFormProps) {
  const allowedTypes = React.useMemo(() => {
    return getAllowedEventTypes(userRole);
  }, [userRole]);

  const [eventType, setEventType] = React.useState<AnimalEventType>(
    initialEventType && allowedTypes.includes(initialEventType)
      ? initialEventType
      : allowedTypes[0] || AnimalEventType.VACCINATION,
  );
  const [eventDate, setEventDate] = React.useState<string>(
    new Date().toISOString().split('T')[0] || '',
  );
  const [notes, setNotes] = React.useState<string>('');

  // Specific fields for VACCINATION
  const [vaccine, setVaccine] = React.useState('');
  const [vaccineDose, setVaccineDose] = React.useState('');
  const [vaccineDisease, setVaccineDisease] = React.useState('');

  // Specific fields for TREATMENT
  const [medicine, setMedicine] = React.useState('');
  const [treatmentDosage, setTreatmentDosage] = React.useState('');
  const [treatmentDiagnosis, setTreatmentDiagnosis] = React.useState('');

  // Specific fields for WEIGHING
  const [weightKg, setWeightKg] = React.useState('');

  // Specific fields for BREEDING
  const [mateTag, setMateTag] = React.useState('');
  const [breedingMethod, setBreedingMethod] = React.useState('Tự nhiên');

  // Specific fields for BIRTH
  const [offspringList, setOffspringList] = React.useState<OffspringItem[]>([
    {
      tag: '',
      sex: AnimalSex.UNKNOWN,
      species: animal.species || '',
      breed: animal.breed || '',
    },
  ]);

  // Specific fields for DEATH
  const [deathCause, setDeathCause] = React.useState('');

  // Specific fields for SALE
  const [salePrice, setSalePrice] = React.useState('');
  const [saleWeightKg, setSaleWeightKg] = React.useState('');
  const [saleBuyer, setSaleBuyer] = React.useState('');

  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Sync default eventType when allowedTypes change
  React.useEffect(() => {
    if (initialEventType && allowedTypes.includes(initialEventType)) {
      setEventType(initialEventType);
    } else if (allowedTypes.length > 0 && !allowedTypes.includes(eventType)) {
      setEventType(allowedTypes[0]!);
    }
  }, [allowedTypes, eventType, initialEventType]);

  const handleAddOffspring = () => {
    setOffspringList((prev) => [
      ...prev,
      {
        tag: '',
        sex: AnimalSex.UNKNOWN,
        species: animal.species || '',
        breed: animal.breed || '',
      },
    ]);
  };

  const handleRemoveOffspring = (index: number) => {
    setOffspringList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateOffspring = (index: number, field: keyof OffspringItem, val: string) => {
    setOffspringList((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      let eventData: Record<string, unknown> = {};

      switch (eventType) {
        case AnimalEventType.VACCINATION:
          if (!vaccine.trim()) {
            throw new Error('Vui lòng nhập tên vắc-xin');
          }
          eventData = {
            vaccine: vaccine.trim(),
            dose: vaccineDose.trim() || undefined,
            disease: vaccineDisease.trim() || undefined,
          };
          break;

        case AnimalEventType.TREATMENT:
          if (!medicine.trim()) {
            throw new Error('Vui lòng nhập tên thuốc');
          }
          eventData = {
            medicine: medicine.trim(),
            dosage: treatmentDosage.trim() || undefined,
            diagnosis: treatmentDiagnosis.trim() || undefined,
          };
          break;

        case AnimalEventType.WEIGHING:
          if (!weightKg || Number(weightKg) <= 0) {
            throw new Error('Vui lòng nhập cân nặng hợp lệ (> 0)');
          }
          eventData = {
            weightKg: Number(weightKg),
          };
          break;

        case AnimalEventType.BREEDING:
          eventData = {
            mateTag: mateTag.trim() || undefined,
            method: breedingMethod.trim() || undefined,
          };
          break;

        case AnimalEventType.BIRTH:
          // Check offspring list
          if (offspringList.length === 0) {
            throw new Error('Cần có ít nhất 1 con non sinh ra');
          }
          for (let i = 0; i < offspringList.length; i++) {
            const child = offspringList[i]!;
            if (!child.tag.trim()) {
              throw new Error(`Vui lòng nhập mã tai/thẻ cho con non #${i + 1}`);
            }
          }
          eventData = {
            offspring: offspringList.map((c) => ({
              tag: c.tag.trim(),
              sex: c.sex,
              species: c.species.trim(),
              breed: c.breed.trim() || undefined,
              motherId: animal.id,
            })),
          };
          break;

        case AnimalEventType.DEATH:
          if (!deathCause.trim()) {
            throw new Error('Vui lòng nhập nguyên nhân chết');
          }
          eventData = {
            cause: deathCause.trim(),
          };
          break;

        case AnimalEventType.SALE:
          eventData = {
            price: salePrice ? Number(salePrice) : undefined,
            weightKg: saleWeightKg ? Number(saleWeightKg) : undefined,
            buyer: saleBuyer.trim() || undefined,
          };
          break;
      }

      const payload = {
        animalId: animal.id,
        type: eventType,
        date: eventDate ? new Date(eventDate).toISOString() : new Date().toISOString(),
        data: eventData,
        notes: notes.trim() || undefined,
      };

      await apiFetch(`/animals/${animal.id}/events`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      onSuccess();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Đã có lỗi xảy ra khi ghi sự kiện');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="event-form">
      {formError && (
        <div className="p-3 text-sm text-crit bg-crit-bg border border-crit/20 rounded-md">
          {formError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="event-type">Loại sự kiện *</Label>
          <Select
            value={eventType}
            onValueChange={(val) => setEventType(val as AnimalEventType)}
            disabled={isSubmitting}
          >
            <SelectTrigger id="event-type">
              <SelectValue placeholder="Chọn loại sự kiện" />
            </SelectTrigger>
            <SelectContent>
              {allowedTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {ANIMAL_EVENT_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="event-date">Ngày xảy ra *</Label>
          <Input
            id="event-date"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>
      </div>

      {/* Các trường động theo loại sự kiện */}
      {eventType === AnimalEventType.VACCINATION && (
        <div
          className="space-y-3 rounded-lg border border-line bg-surface-2 p-3"
          data-testid="fields-vaccination"
        >
          <h4 className="text-xs font-semibold uppercase text-muted">Thông tin tiêm phòng</h4>
          <div className="space-y-1">
            <Label htmlFor="vaccine-name">Tên vắc-xin *</Label>
            <Input
              id="vaccine-name"
              placeholder="VD: Vắc-xin Lở mồm long móng, Tụ huyết trùng..."
              value={vaccine}
              onChange={(e) => setVaccine(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="vaccine-dose">Liều lượng</Label>
              <Input
                id="vaccine-dose"
                placeholder="VD: 2 ml"
                value={vaccineDose}
                onChange={(e) => setVaccineDose(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vaccine-disease">Bệnh phòng ngừa</Label>
              <Input
                id="vaccine-disease"
                placeholder="VD: LMLM Type O"
                value={vaccineDisease}
                onChange={(e) => setVaccineDisease(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}

      {eventType === AnimalEventType.TREATMENT && (
        <div
          className="space-y-3 rounded-lg border border-line bg-surface-2 p-3"
          data-testid="fields-treatment"
        >
          <h4 className="text-xs font-semibold uppercase text-muted">
            Thông tin điều trị & Dùng thuốc
          </h4>
          <div className="space-y-1">
            <Label htmlFor="medicine-name">Tên thuốc / Phác đồ *</Label>
            <Input
              id="medicine-name"
              placeholder="VD: Amoxicillin, Kháng viêm..."
              value={medicine}
              onChange={(e) => setMedicine(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="treatment-dosage">Liều dùng</Label>
              <Input
                id="treatment-dosage"
                placeholder="VD: 5 ml/ngày x 3 ngày"
                value={treatmentDosage}
                onChange={(e) => setTreatmentDosage(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="treatment-diag">Chẩn đoán / Bệnh</Label>
              <Input
                id="treatment-diag"
                placeholder="VD: Viêm phổi, Tiêu chảy..."
                value={treatmentDiagnosis}
                onChange={(e) => setTreatmentDiagnosis(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}

      {eventType === AnimalEventType.WEIGHING && (
        <div
          className="space-y-3 rounded-lg border border-line bg-surface-2 p-3"
          data-testid="fields-weighing"
        >
          <h4 className="text-xs font-semibold uppercase text-muted">Cân trọng lượng</h4>
          <div className="space-y-1">
            <Label htmlFor="weight-kg">Trọng lượng (kg) *</Label>
            <Input
              id="weight-kg"
              type="number"
              step="0.01"
              min="0"
              placeholder="VD: 350.5"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
        </div>
      )}

      {eventType === AnimalEventType.BREEDING && (
        <div
          className="space-y-3 rounded-lg border border-line bg-surface-2 p-3"
          data-testid="fields-breeding"
        >
          <h4 className="text-xs font-semibold uppercase text-muted">Phối giống</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="mate-tag">Mã đực giống</Label>
              <Input
                id="mate-tag"
                placeholder="VD: DUC-001 hoặc Nguồn tinh"
                value={mateTag}
                onChange={(e) => setMateTag(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="breed-method">Phương pháp phối</Label>
              <Input
                id="breed-method"
                placeholder="VD: Thụ tinh nhân tạo / Trực tiếp"
                value={breedingMethod}
                onChange={(e) => setBreedingMethod(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}

      {eventType === AnimalEventType.BIRTH && (
        <div
          className="space-y-3 rounded-lg border border-line bg-surface-2 p-3"
          data-testid="fields-birth"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted">
                Danh sách con non sinh ra ({offspringList.length} con)
              </h4>
              <p className="text-xs text-muted">
                Hệ thống sẽ tự động tạo hồ sơ cá thể con non với mẹ là {animal.tag}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddOffspring}
              disabled={isSubmitting}
              className="h-7 text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Thêm con non
            </Button>
          </div>

          <div className="space-y-3 pt-1">
            {offspringList.map((offspring, index) => (
              <div
                key={index}
                className="rounded-md border border-line bg-surface p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-accent">
                    Con non #{index + 1}
                  </span>
                  {offspringList.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveOffspring(index)}
                      className="h-6 w-6 p-0 text-crit hover:text-crit"
                      title="Xóa dòng này"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor={`offspring-tag-${index}`} className="text-xs">
                      Mã tai / Thẻ *
                    </Label>
                    <Input
                      id={`offspring-tag-${index}`}
                      placeholder="VD: CON-01"
                      value={offspring.tag}
                      onChange={(e) => handleUpdateOffspring(index, 'tag', e.target.value)}
                      disabled={isSubmitting}
                      required
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`offspring-sex-${index}`} className="text-xs">
                      Giới tính
                    </Label>
                    <Select
                      value={offspring.sex}
                      onValueChange={(val) => handleUpdateOffspring(index, 'sex', val)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id={`offspring-sex-${index}`} className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={AnimalSex.MALE}>
                          {ANIMAL_SEX_LABELS[AnimalSex.MALE]}
                        </SelectItem>
                        <SelectItem value={AnimalSex.FEMALE}>
                          {ANIMAL_SEX_LABELS[AnimalSex.FEMALE]}
                        </SelectItem>
                        <SelectItem value={AnimalSex.UNKNOWN}>
                          {ANIMAL_SEX_LABELS[AnimalSex.UNKNOWN]}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor={`offspring-species-${index}`} className="text-xs">
                      Loài
                    </Label>
                    <Input
                      id={`offspring-species-${index}`}
                      value={offspring.species}
                      onChange={(e) => handleUpdateOffspring(index, 'species', e.target.value)}
                      disabled={isSubmitting}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`offspring-breed-${index}`} className="text-xs">
                      Giống
                    </Label>
                    <Input
                      id={`offspring-breed-${index}`}
                      value={offspring.breed}
                      onChange={(e) => handleUpdateOffspring(index, 'breed', e.target.value)}
                      disabled={isSubmitting}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {eventType === AnimalEventType.DEATH && (
        <div
          className="space-y-3 rounded-lg border border-crit/20 bg-crit-bg/40 p-3"
          data-testid="fields-death"
        >
          <div className="flex items-start gap-2 text-warn">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="text-xs">
              <strong>Cảnh báo:</strong> Sau khi ghi sự kiện này, trạng thái của cá thể sẽ chuyển
              thành <strong>ĐÃ CHẾT</strong>. Sau đó sẽ không thể ghi thêm sự kiện nào khác cho cá
              thể này.
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="death-cause">Nguyên nhân chết *</Label>
            <Input
              id="death-cause"
              placeholder="VD: Dịch bệnh, Chấn thương, Tuổi già..."
              value={deathCause}
              onChange={(e) => setDeathCause(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
        </div>
      )}

      {eventType === AnimalEventType.SALE && (
        <div
          className="space-y-3 rounded-lg border border-warn/20 bg-warn-bg/40 p-3"
          data-testid="fields-sale"
        >
          <div className="flex items-start gap-2 text-warn">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="text-xs">
              <strong>Cảnh báo:</strong> Sau khi ghi sự kiện này, trạng thái của cá thể sẽ chuyển
              thành <strong>ĐÃ BÁN</strong>. Sau đó sẽ không thể ghi thêm sự kiện nào khác cho cá
              thể này.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="sale-price">Giá bán (VNĐ)</Label>
              <Input
                id="sale-price"
                type="number"
                min="0"
                placeholder="VD: 25000000"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sale-weight">Trọng lượng xuất bán (kg)</Label>
              <Input
                id="sale-weight"
                type="number"
                step="0.01"
                min="0"
                placeholder="VD: 380"
                value={saleWeightKg}
                onChange={(e) => setSaleWeightKg(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="sale-buyer">Người mua / Thương lái</Label>
            <Input
              id="sale-buyer"
              placeholder="VD: Công ty TNHH Thực Phẩm Sạch..."
              value={saleBuyer}
              onChange={(e) => setSaleBuyer(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="event-notes">Ghi chú sự kiện</Label>
        <Input
          id="event-notes"
          placeholder="Người thực hiện, tình trạng sức khỏe, lưu ý..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Hủy bỏ
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Đang lưu...' : 'Lưu sự kiện'}
        </Button>
      </div>
    </form>
  );
}

export interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  animal: AnimalItem;
  userRole?: string | null;
  onSuccess: () => void;
  initialEventType?: AnimalEventType;
}

export function EventDialog({
  open,
  onOpenChange,
  animal,
  userRole,
  onSuccess,
  initialEventType,
}: EventDialogProps) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Ghi sự kiện chăn nuôi – ${animal.tag}`}
      description="Ghi nhận tiêm phòng, điều trị, cân nặng, sinh sản, xuất bán hoặc khai tử"
      className="max-w-xl max-h-[90vh] overflow-y-auto"
    >
      <EventForm
        animal={animal}
        userRole={userRole}
        initialEventType={initialEventType}
        onSuccess={() => {
          onOpenChange(false);
          onSuccess();
        }}
        onCancel={() => onOpenChange(false)}
      />
    </FormDialog>
  );
}
