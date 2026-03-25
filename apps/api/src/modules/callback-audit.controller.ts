import { Controller, Get, Query } from "@nestjs/common";
import { CallbackAuditService } from "./callback-audit.service";

@Controller("callback-audits")
export class CallbackAuditController {
  constructor(private readonly callbackAuditService: CallbackAuditService) {}

  @Get()
  list(@Query("limit") limit?: string) {
    return this.callbackAuditService.list(Number(limit ?? 50));
  }
}
