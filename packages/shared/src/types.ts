export enum Role {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  ACCOUNTANT = 'ACCOUNTANT',
  SALES = 'SALES',
  WORKER = 'WORKER',
}

export enum AreaType {
  ZONE = 'ZONE',
  FIELD = 'FIELD',
  GREENHOUSE = 'GREENHOUSE',
  BARN = 'BARN',
  POND = 'POND',
  VISITOR_ZONE = 'VISITOR_ZONE',
  WAREHOUSE_ZONE = 'WAREHOUSE_ZONE',
}

export enum CycleKind {
  CROP = 'CROP',
  LIVESTOCK = 'LIVESTOCK',
  AQUA = 'AQUA',
}

export enum CycleStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  HARVESTING = 'HARVESTING',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum ActivityType {
  SOWING = 'SOWING',
  PLANTING = 'PLANTING',
  FERTILIZING = 'FERTILIZING',
  SPRAYING = 'SPRAYING',
  IRRIGATION = 'IRRIGATION',
  PRUNING = 'PRUNING',
  WEEDING = 'WEEDING',
  FEEDING = 'FEEDING',
  VACCINATION = 'VACCINATION',
  TREATMENT = 'TREATMENT',
  WATER_TEST = 'WATER_TEST',
  STOCKING = 'STOCKING',
  MORTALITY = 'MORTALITY',
  WEIGHING = 'WEIGHING',
  HARVEST = 'HARVEST',
  CLEANING = 'CLEANING',
  OTHER = 'OTHER',
}

export enum AnimalSex {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  UNKNOWN = 'UNKNOWN',
}

export enum AnimalStatus {
  ALIVE = 'ALIVE',
  SOLD = 'SOLD',
  DEAD = 'DEAD',
}

export enum AnimalEventType {
  VACCINATION = 'VACCINATION',
  TREATMENT = 'TREATMENT',
  BREEDING = 'BREEDING',
  BIRTH = 'BIRTH',
  WEIGHING = 'WEIGHING',
  DEATH = 'DEATH',
  SALE = 'SALE',
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
