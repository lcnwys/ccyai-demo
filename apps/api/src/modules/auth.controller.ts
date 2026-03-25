import { Body, Controller, Get, Headers, Post, Put } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() body: { name: string; email: string; password: string }) {
    return this.authService.register(body);
  }

  @Post("login")
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body);
  }

  @Get("me")
  me(@Headers("authorization") authorization?: string) {
    return this.authService.getProfile(authorization);
  }

  @Put("me/chcy-credentials")
  updateCredentials(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: { chcyAccessKey: string; chcySecretKey: string }
  ) {
    return this.authService.updateProfileCredentials(authorization, body);
  }
}
