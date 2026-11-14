import { Controller, Get, Inject, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/session.guard';
import { ProfilesService } from './profiles.service';

@ApiTags('Perfis públicos')
@Controller('profiles')
export class ProfilesController {
  constructor(@Inject(ProfilesService) private readonly profiles: ProfilesService) {}
  @Public() @Get('sitemap') sitemap() {
    return this.profiles.sitemap();
  }
  @Public() @Get(':username') profile(@Param('username') username: string) {
    return this.profiles.profile(username);
  }
  @Public() @Get(':username/collections/:slug') collection(
    @Param('username') username: string,
    @Param('slug') slug: string,
  ) {
    return this.profiles.collection(username, slug);
  }
}
