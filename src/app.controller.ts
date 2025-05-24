import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('env')
  getHello(): string {
    return process.env.UPSTREAM_COLOR || 'local';
  }
}
