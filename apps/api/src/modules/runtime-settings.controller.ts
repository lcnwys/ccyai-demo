import { Body, Controller, ForbiddenException, Get, Headers, Put } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RuntimeConfigService, RuntimeSettings } from "./runtime-config.service";

@Controller("system-settings")
export class RuntimeSettingsController {
  constructor(
    private readonly runtimeConfigService: RuntimeConfigService,
    private readonly authService: AuthService
  ) {}

  private async ensureAdmin(authorization?: string) {
    const user = await this.authService.getCurrentUser(authorization);
    if (user.role !== "ADMIN") {
      throw new ForbiddenException("只有管理员可以查看或修改系统设置。");
    }
    return user;
  }

  @Get()
  async getSettings(@Headers("authorization") authorization?: string) {
    await this.ensureAdmin(authorization);
    return this.runtimeConfigService.getPublicSettings();
  }

  @Put()
  async updateSettings(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: RuntimeSettings
  ) {
    await this.ensureAdmin(authorization);
    return this.runtimeConfigService.update(body);
  }
}
