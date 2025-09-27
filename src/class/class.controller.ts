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

  // ------- Sesiones globales (con filtros por branchId, classRefId, day)
  @Get('sessions')
  listSessions(@Query() q: ListSessionsQuery) {
    return this.svc.listSessions(q);
  }

  // ------- ABM de clases
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

  // ------- Sesiones anidadas a una clase específica
  @Post(':classId/sessions')
  scheduleForClass(@Param('classId') classId: string, @Body() dto: ScheduleSessionDto) {
    return this.svc.scheduleSession({ ...dto, classId });
  }
}
