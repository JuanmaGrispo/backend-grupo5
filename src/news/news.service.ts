import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { News } from './news.entity';
import { CreateNewsDto } from './dtos/create-news.dto';
import { UpdateNewsDto } from './dtos/update-news.dto';

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(News)
    private readonly newsRepo: Repository<News>,
  ) {}

  async create(dto: CreateNewsDto): Promise<News> {
    const news = this.newsRepo.create({
      title: dto.title,
      content: dto.content,
    });

    return this.newsRepo.save(news);
  }

  async findAll(): Promise<News[]> {
    return this.newsRepo.find();
  }

  async findOne(id: string): Promise<News> {
    const news = await this.newsRepo.findOne({ where: { id } });
    if (!news) {
      throw new NotFoundException('Novedad no encontrada');
    }
    return news;
  }

  async update(id: string, dto: UpdateNewsDto): Promise<News> {
    const news = await this.findOne(id);

    if (dto.title !== undefined) {
      news.title = dto.title;
    }
    if (dto.content !== undefined) {
      news.content = dto.content;
    }

    return this.newsRepo.save(news);
  }

  async remove(id: string): Promise<void> {
    const news = await this.findOne(id);
    await this.newsRepo.remove(news);
  }
}

