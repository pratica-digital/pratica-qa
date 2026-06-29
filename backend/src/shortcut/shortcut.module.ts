import { Module } from '@nestjs/common';
import { ShortcutFailureStoryService } from './shortcut-failure-story.service';
import { ShortcutService } from './shortcut.service';

@Module({
  providers: [ShortcutService, ShortcutFailureStoryService],
  exports: [ShortcutFailureStoryService, ShortcutService],
})
export class ShortcutModule {}
