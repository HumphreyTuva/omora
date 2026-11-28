import { Controller, Get } from '@nestjs/common';
// A check that does NOT touch the database. Point UptimeRobot (or any monitor) at /api/v1/health, never at a page that reads the database,
// otherwise the monitor keeps the database awake all day and uses up its monthly hours.
@Controller('health')
export class HealthController { @Get() ok() { return { ok: true }; } }
