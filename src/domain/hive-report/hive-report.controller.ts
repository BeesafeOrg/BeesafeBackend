import { Controller } from '@nestjs/common';
import { HiveReportService } from './hive-report.service';

@Controller('hive-report')
export class HiveReportController {
  constructor(private readonly hiveReportService: HiveReportService) {}
}
