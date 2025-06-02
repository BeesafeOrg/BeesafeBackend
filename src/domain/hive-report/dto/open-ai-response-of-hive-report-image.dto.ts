import { Species } from '../constant/species.enum';

export interface OpenAiResponseOfHiveReportImageDto {
  hiveReportId: string;
  imageUrl: string;
  aiResponseOfSpecies: Species;
  aiConfidenceOfSpecies: number;
  aiReasonOfSpecies: string;
}