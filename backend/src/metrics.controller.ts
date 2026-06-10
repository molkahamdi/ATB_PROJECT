import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import * as client from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

@Controller()
export class MetricsController {
  @Get('metrics')
  async getMetrics(@Res() res: Response) {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
  }
}