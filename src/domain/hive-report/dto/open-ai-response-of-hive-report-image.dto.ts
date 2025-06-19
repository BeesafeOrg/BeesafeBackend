import { Species } from '../constant/species.enum';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { HiveProofResponseDto } from './hive-proof-response.dto';

export class OpenAiResponseOfHiveReportImageDto extends PickType(
  HiveProofResponseDto,
  ['hiveReportId', 'imageUrl'],
) {
  @ApiProperty({
    description: 'AI가 구분한 벌집 종류',
    enum: Species,
    example: Species.HONEYBEE,
  })
  aiResponseOfSpecies: Species;

  @ApiProperty({
    description: 'AI가 구분한 벌집의 정확성 정도',
    example: '0.95',
  })
  aiConfidenceOfSpecies: number;

  @ApiProperty({
    description: 'AI가 벌집을 위와같이 구분한 이유',
    example: '0.95',
  })
  aiReasonOfSpecies: string;
}
