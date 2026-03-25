import { Body, Controller, Get, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body);
  }

  @Get("bootstrap-user")
  bootstrapUser() {
    return this.authService.getBootstrapInfo();
  }
}
