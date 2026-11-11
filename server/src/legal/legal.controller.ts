import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '../common/decorators';
import { PRIVACY_PAGE, SUPPORT_PAGE } from './legal-pages';

/**
 * Public static legal pages for the App Store (Support + Privacy URLs).
 * No auth, no DB. The per-route CSP header allows the inline <style> block,
 * which helmet's default style-src 'self' would otherwise block.
 */
@Public()
@Controller('legal')
export class LegalController {
  @Get('support')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Content-Security-Policy', "default-src 'self'; style-src 'unsafe-inline'")
  support(): string {
    return SUPPORT_PAGE;
  }

  @Get('privacy')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Content-Security-Policy', "default-src 'self'; style-src 'unsafe-inline'")
  privacy(): string {
    return PRIVACY_PAGE;
  }
}
