import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  clubInputSchema,
  clubPatchSchema,
  clubQuerySchema,
  friendRequestInputSchema,
  messageInputSchema,
  userSearchQuerySchema,
  type ClubInput,
  type ClubPatch,
  type FriendRequestInput,
  type MessageInput,
} from '@jinsei/contracts';
import { CurrentUserId } from '../auth/session.guard';
import { RateLimit } from '../../common/rate-limit';
import { ApiZodBody, ZodPipe } from '../../common/zod.pipe';
import { CommunityService } from './community.service';

@ApiTags('Comunidade')
@ApiCookieAuth()
@Controller('community')
export class CommunityController {
  constructor(@Inject(CommunityService) private readonly community: CommunityService) {}

  @Get('summary') summary(@CurrentUserId() userId: string) {
    return this.community.summary(userId);
  }
  @Get('users')
  @RateLimit(60)
  search(
    @CurrentUserId() userId: string,
    @Query(new ZodPipe(userSearchQuerySchema)) query: { q: string },
  ) {
    return this.community.search(userId, query.q);
  }
  @Get('relationships/:username') relationship(
    @CurrentUserId() userId: string,
    @Param('username') username: string,
  ) {
    return this.community.relationship(userId, username);
  }

  @Get('friends') friends(@CurrentUserId() userId: string) {
    return this.community.friends(userId);
  }
  @Post('friends')
  @RateLimit(30)
  @ApiZodBody(friendRequestInputSchema)
  request(
    @CurrentUserId() userId: string,
    @Body(new ZodPipe(friendRequestInputSchema)) input: FriendRequestInput,
  ) {
    return this.community.request(userId, input.username);
  }
  @Post('friends/requests/:id/accept') accept(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ) {
    return this.community.accept(userId, id);
  }
  @Delete('friends/requests/:id') dismiss(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ) {
    return this.community.dismiss(userId, id);
  }
  @Delete('friends/:userId') unfriend(
    @CurrentUserId() userId: string,
    @Param('userId') otherId: string,
  ) {
    return this.community.unfriend(userId, otherId);
  }
  @Get('feed') feed(@CurrentUserId() userId: string) {
    return this.community.feed(userId);
  }

  @Get('conversations') conversations(@CurrentUserId() userId: string) {
    return this.community.conversations(userId);
  }
  @Get('conversations/:userId') conversation(
    @CurrentUserId() userId: string,
    @Param('userId') otherId: string,
    @Query('before') before?: string,
  ) {
    return this.community.conversation(userId, otherId, before);
  }
  @Post('conversations/:userId')
  @RateLimit(40)
  @ApiZodBody(messageInputSchema)
  send(
    @CurrentUserId() userId: string,
    @Param('userId') otherId: string,
    @Body(new ZodPipe(messageInputSchema)) input: MessageInput,
  ) {
    return this.community.send(userId, otherId, input.body);
  }

  @Get('clubs') clubs(
    @CurrentUserId() userId: string,
    @Query(new ZodPipe(clubQuerySchema)) query: { q?: string; mine?: string },
  ) {
    return this.community.clubs(userId, query);
  }
  @Post('clubs')
  @RateLimit(10)
  @ApiZodBody(clubInputSchema)
  createClub(
    @CurrentUserId() userId: string,
    @Body(new ZodPipe(clubInputSchema)) input: ClubInput,
  ) {
    return this.community.createClub(userId, input);
  }
  @Get('clubs/:slug') club(
    @CurrentUserId() userId: string,
    @Param('slug') slug: string,
    @Query('before') before?: string,
  ) {
    return this.community.club(userId, slug, before);
  }
  @Patch('clubs/:slug')
  @ApiZodBody(clubPatchSchema)
  updateClub(
    @CurrentUserId() userId: string,
    @Param('slug') slug: string,
    @Body(new ZodPipe(clubPatchSchema)) input: ClubPatch,
  ) {
    return this.community.updateClub(userId, slug, input);
  }
  @Delete('clubs/:slug') removeClub(@CurrentUserId() userId: string, @Param('slug') slug: string) {
    return this.community.removeClub(userId, slug);
  }
  @Post('clubs/:slug/membership') join(
    @CurrentUserId() userId: string,
    @Param('slug') slug: string,
  ) {
    return this.community.join(userId, slug);
  }
  @Delete('clubs/:slug/membership') leave(
    @CurrentUserId() userId: string,
    @Param('slug') slug: string,
  ) {
    return this.community.leave(userId, slug);
  }
  @Post('clubs/:slug/posts')
  @RateLimit(20)
  @ApiZodBody(messageInputSchema)
  post(
    @CurrentUserId() userId: string,
    @Param('slug') slug: string,
    @Body(new ZodPipe(messageInputSchema)) input: MessageInput,
  ) {
    return this.community.post(userId, slug, input.body);
  }
  @Delete('clubs/:slug/posts/:id') removePost(
    @CurrentUserId() userId: string,
    @Param('slug') slug: string,
    @Param('id') id: string,
  ) {
    return this.community.removePost(userId, slug, id);
  }
}
