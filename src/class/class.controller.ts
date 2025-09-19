// src/classes/class.controller.ts
import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ClassService } from './class.service';
import { CreateClassDto } from './dtos/create-class.dto';
import { UpdateClassDto } from './dtos/update-class.dto';
import { ScheduleSessionDto } from './dtos/schedule-session.dto';
import { UpdateSessionDto } from './dtos/update-session.dto';
import { ListSessionsQuery } from './dtos/list-sessions.dto';

@Controller('classes')
export class ClassController {
  constructor(private readonly svc: ClassService) {}

  // ------- Clases (ABM)
  @Post()
  createClass(@Body() dto: CreateClassDto) {
    return this.svc.createClass(dto);
  }

  @Get()
  listClasses() {
    return this.svc.listClasses();
  }

  @Get(':id')
  getClass(@Param('id') id: string) {
    return this.svc.getClass(id);
  }

  @Patch(':id')
  updateClass(@Param('id') id: string, @Body() dto: UpdateClassDto) {
    return this.svc.updateClass(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteClass(@Param('id') id: string) {
    return this.svc.deleteClass(id);
  }

  // ------- Sesiones (anidadas por clase)
  @Post(':classId/sessions')
  scheduleForClass(@Param('classId') classId: string, @Body() dto: ScheduleSessionDto) {
    return this.svc.scheduleSession({ ...dto, classId });
  }

  @Get(':classId/sessions')
  listSessionsByClass(@Param('classId') classId: string, @Query() q: ListSessionsQuery) {
    return this.svc.listSessions({ ...q, classId });
  }

  // ------- Sesiones (globales)
  @Get('sessions')
  listSessions(@Query() q: ListSessionsQuery) {
    return this.svc.listSessions(q);
  }

  @Get('sessions/:id')
  getSession(@Param('id') id: string) {
    return this.svc.getSession(id);
  }

  @Patch('sessions/:id')
  updateSession(@Param('id') id: string, @Body() dto: UpdateSessionDto) {
    return this.svc.updateSession(id, dto);
  }

  @Patch('sessions/:id/start')
  startSession(@Param('id') id: string) {
    return this.svc.startSession(id);
  }

  @Patch('sessions/:id/complete')
  completeSession(@Param('id') id: string) {
    return this.svc.completeSession(id);
  }

  @Patch('sessions/:id/cancel')
  cancelSession(@Param('id') id: string) {
    return this.svc.cancelSession(id, 'Canceled by admin');
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteSession(@Param('id') id: string) {
    return this.svc.deleteSession(id);
  }
}
