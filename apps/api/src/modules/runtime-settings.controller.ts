import { Body, Controller, Get, Put } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RuntimeConfigService, RuntimeSettings } from "./runtime-config.service";

@Controller("system-settings")
export class RuntimeSettingsController {
  constructor(
    private readonly runtimeConfigService: RuntimeConfigService,
    private readonly authService: AuthService
  ) {}

  @Get()
  getSettings() {
    return this.runtimeConfigService.getPublicSettings();
  }

  @Put()
  async updateSettings(@Body() body: RuntimeSettings) {
    const result = await this.runtimeConfigService.update(body);
    await this.authService.ensureBootstrapUser();
    return result;
  }
}
