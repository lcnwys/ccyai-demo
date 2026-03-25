import { Body, Controller, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { CallbackService } from "./callback.service";

@Controller("callbacks/chcyai")
export class CallbackController {
  constructor(private readonly callbackService: CallbackService) {}

  @Post()
  handleCallback(
    @Body() body: Record<string, unknown>,
    @Req() request: Request & { rawBody?: Buffer }
  ) {
    return this.callbackService.handleProviderCallback({
      body,
      headers: request.headers,
      rawBody: request.rawBody
    });
  }
}
