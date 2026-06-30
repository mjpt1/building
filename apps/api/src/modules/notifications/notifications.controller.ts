import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  list(@CurrentUser('id') userId: string, @Query() q: PaginationQueryDto) {
    return this.svc.list(userId, q);
  }

  @Get('unread-count')
  unread(@CurrentUser('id') userId: string) {
    return this.svc.unreadCount(userId);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.svc.markRead(id, userId);
  }

  @Patch('read-all')
  markAll(@CurrentUser('id') userId: string) {
    return this.svc.markAllRead(userId);
  }
}
