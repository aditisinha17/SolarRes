import { PanelType } from '../enums/panel-type';

export interface LeadRequest {
  name: string;
  phone: string;
  email: string;
  city: string;
  roofAreaSqm: number;
  interestedPanelType?: PanelType;
}
